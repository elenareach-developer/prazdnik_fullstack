"""Speech-to-Text, independent from the LLM.

Providers (STT_PROVIDER in backend/.env):
  - faster_whisper  (default) local recognition, no external service, model downloads once
  - openai_whisper  OpenAI Whisper API, needs STT_API_KEY

Audio is processed in memory only and never written to disk.
"""
import io
import logging
import os
import threading
from dataclasses import dataclass
from typing import Optional, Protocol

from dotenv import load_dotenv

from .errors import AudioValidationError, EmptyTranscriptError, STTError, STTUnavailableError

load_dotenv()
logger = logging.getLogger("uvicorn.error")

SUPPORTED_LANGUAGES = {"ru", "en"}
MIN_AUDIO_BYTES = 1000
ALLOWED_MIME_TYPES = {
    "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/mp3",
    "audio/wav", "audio/x-wav", "audio/wave", "audio/m4a", "audio/x-m4a", "audio/aac",
    "video/webm",  # some browsers label audio-only WebM recordings this way
}
_OPENAI_LANGUAGE_NAMES = {"russian": "ru", "english": "en"}


def max_audio_bytes() -> int:
    try:
        megabytes = float(os.getenv("VOICE_MAX_AUDIO_MB", "10"))
    except ValueError:
        megabytes = 10
    return int(megabytes * 1024 * 1024)


@dataclass
class Transcription:
    text: str
    language: Optional[str] = None


# ---------------------------------------------------------------- validation

def _sniff_format(data: bytes) -> Optional[str]:
    """Recognise the container by its magic bytes (protects against fake/corrupted files)."""
    if data.startswith(b"\x1a\x45\xdf\xa3"):
        return "webm"
    if data.startswith(b"OggS"):
        return "ogg"
    if data.startswith(b"RIFF") and data[8:12] == b"WAVE":
        return "wav"
    if data[4:8] == b"ftyp":
        return "mp4"
    if data.startswith(b"ID3") or (len(data) > 1 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0):
        return "mp3"
    return None


def normalize_mime(content_type: Optional[str]) -> str:
    return (content_type or "").split(";")[0].strip().lower()


def validate_audio(data: bytes, content_type: Optional[str]) -> str:
    """Return the detected format or raise AudioValidationError with a user-friendly message."""
    mime = normalize_mime(content_type)
    if mime not in ALLOWED_MIME_TYPES:
        raise AudioValidationError(
            "Неподдерживаемый формат аудио. Используйте WebM, OGG, MP4, MP3 или WAV.", 415
        )
    if len(data) > max_audio_bytes():
        limit_mb = max_audio_bytes() // (1024 * 1024)
        raise AudioValidationError(f"Аудиофайл слишком большой (максимум {limit_mb} МБ).", 413)
    if len(data) < MIN_AUDIO_BYTES:
        raise AudioValidationError("Запись пустая или слишком короткая. Попробуйте ещё раз.", 400)
    detected = _sniff_format(data)
    if detected is None:
        raise AudioValidationError("Аудиофайл повреждён или не является аудио.", 400)
    return detected


def normalize_language(language: Optional[str]) -> Optional[str]:
    if not language:
        return None
    code = language.strip().lower()[:2]
    if code not in SUPPORTED_LANGUAGES:
        raise AudioValidationError("Поддерживаются только русский (ru) и английский (en) языки.", 400)
    return code


# ---------------------------------------------------------------- providers

class STTProvider(Protocol):
    def transcribe(self, data: bytes, mime: str, language: Optional[str]) -> Transcription: ...


class FasterWhisperProvider:
    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()

    def _get_model(self):
        with self._lock:
            if self._model is None:
                try:
                    from faster_whisper import WhisperModel
                except ImportError as error:
                    raise STTUnavailableError(
                        "Распознавание речи не настроено: установите пакет faster-whisper "
                        "или выберите STT_PROVIDER=openai_whisper."
                    ) from error
                model_name = os.getenv("STT_MODEL", "small")
                try:
                    self._model = WhisperModel(
                        model_name,
                        device=os.getenv("STT_DEVICE", "cpu"),
                        compute_type=os.getenv("STT_COMPUTE_TYPE", "int8"),
                    )
                except Exception as error:   # download blocked, wrong model name, no disk space…
                    logger.warning("faster-whisper model '%s' failed to load: %s", model_name, error)
                    raise STTUnavailableError(
                        "Модель распознавания речи не загрузилась. Проверьте интернет при первом запуске "
                        "и значение STT_MODEL в backend/.env."
                    ) from error
            return self._model

    def transcribe(self, data: bytes, mime: str, language: Optional[str]) -> Transcription:
        model = self._get_model()
        try:
            segments, info = model.transcribe(io.BytesIO(data), language=language, vad_filter=True)
            text = " ".join(segment.text.strip() for segment in segments)
        except STTUnavailableError:
            raise
        except Exception as error:
            logger.warning("faster-whisper failed: %s", error)
            raise STTError("Не удалось распознать аудио. Попробуйте записать ещё раз.") from error
        return Transcription(text=text.strip(), language=getattr(info, "language", language))


class OpenAIWhisperProvider:
    URL = "https://api.openai.com/v1/audio/transcriptions"

    def transcribe(self, data: bytes, mime: str, language: Optional[str]) -> Transcription:
        api_key = os.getenv("STT_API_KEY")
        if not api_key:
            raise STTUnavailableError("STT_API_KEY не найден в backend/.env")
        import httpx

        form = {"model": os.getenv("STT_MODEL", "whisper-1"), "response_format": "verbose_json"}
        if language:
            form["language"] = language
        extension = mime.split("/")[-1].replace("x-", "").replace("mpeg", "mp3")
        try:
            response = httpx.post(
                self.URL,
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": (f"voice.{extension}", data, mime)},
                data=form,
                timeout=60,
            )
        except httpx.HTTPError as error:
            logger.warning("Whisper API request failed: %s", error)
            raise STTError("Сервис распознавания речи недоступен. Попробуйте позже.") from error

        if response.status_code in (401, 403):
            raise STTUnavailableError("Неверный STT_API_KEY для распознавания речи.")
        if response.status_code == 429:
            raise STTError("Превышен лимит сервиса распознавания речи. Подождите минуту.")
        if response.status_code == 400:
            raise STTError("Не удалось распознать аудио. Попробуйте записать ещё раз.")
        if response.status_code >= 400:
            logger.warning("Whisper API error %s: %s", response.status_code, response.text[:300])
            raise STTError("Ошибка сервиса распознавания речи. Попробуйте позже.")

        payload = response.json()
        detected = _OPENAI_LANGUAGE_NAMES.get(str(payload.get("language", "")).lower(), language)
        return Transcription(text=str(payload.get("text", "")).strip(), language=detected)


_PROVIDERS: dict[str, STTProvider] = {}
_provider_override: Optional[STTProvider] = None   # used by tests


def get_stt_provider() -> STTProvider:
    if _provider_override is not None:
        return _provider_override
    name = os.getenv("STT_PROVIDER", "faster_whisper").strip().lower()
    if name not in ("faster_whisper", "openai_whisper"):
        raise STTUnavailableError(f"Неизвестный STT_PROVIDER: {name}")
    if name not in _PROVIDERS:
        _PROVIDERS[name] = FasterWhisperProvider() if name == "faster_whisper" else OpenAIWhisperProvider()
    return _PROVIDERS[name]


def transcribe_audio(data: bytes, content_type: Optional[str], language: Optional[str] = None) -> Transcription:
    validate_audio(data, content_type)
    language = normalize_language(language)
    result = get_stt_provider().transcribe(data, normalize_mime(content_type), language)
    result.text = (result.text or "").strip()
    if not result.text:
        raise EmptyTranscriptError("Не удалось разобрать речь. Говорите чуть громче и попробуйте ещё раз.")
    if result.language and result.language not in SUPPORTED_LANGUAGES:
        result.language = None
    return result
