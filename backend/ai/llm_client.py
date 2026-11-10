import logging
import os
import time

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("uvicorn.error")

DEFAULT_MODEL = "gemini-3.5-flash-lite"


class AIUnavailableError(Exception):
    """LLM is not configured (e.g. GEMINI_API_KEY missing)."""


class AIGenerationError(Exception):
    """LLM call failed."""


_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise AIUnavailableError("GEMINI_API_KEY не найден в backend/.env")
    try:
        from google import genai
    except ImportError as error:
        raise AIUnavailableError("Пакет google-genai не установлен") from error
    _client = genai.Client(api_key=api_key)
    return _client


_FRIENDLY_ERRORS = {
    400: "Gemini отклонил запрос (400). Проверьте GEMINI_MODEL и регион: API доступен не во всех странах.",
    401: "Неверный GEMINI_API_KEY (401).",
    403: "Нет доступа к Gemini (403): проверьте ключ и доступность API в вашем регионе.",
    404: "Модель не найдена (404). Проверьте GEMINI_MODEL в backend/.env.",
    429: "Превышен лимит запросов Gemini (429). Подождите минуту и повторите.",
    500: "Внутренняя ошибка Gemini (500). Повторите чуть позже.",
    503: "Модель Gemini перегружена (503). Повторите через минуту.",
}
_RETRY_CODES = {500, 503}
_RETRY_DELAYS = (2, 4)


def _error_code(error: Exception):
    code = getattr(error, "code", None)
    return code if isinstance(code, int) else None


def generate_text(prompt: str) -> str:
    client = _get_client()
    model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    for attempt in range(len(_RETRY_DELAYS) + 1):
        try:
            response = client.models.generate_content(model=model, contents=prompt)
            break
        except Exception as error:
            code = _error_code(error)
            logger.warning("Gemini error (model=%s, attempt=%s, code=%s): %s",
                           model, attempt + 1, code, error)
            if code in _RETRY_CODES and attempt < len(_RETRY_DELAYS):
                time.sleep(_RETRY_DELAYS[attempt])
                continue
            message = _FRIENDLY_ERRORS.get(code, f"Ошибка генерации: {error}")
            raise AIGenerationError(message) from error

    text = (response.text or "").strip()
    if not text:
        finish = None
        if getattr(response, "candidates", None):
            finish = getattr(response.candidates[0], "finish_reason", None)
        logger.warning("Gemini returned empty text (model=%s, finish_reason=%s)", model, finish)
        raise AIGenerationError(
            f"Модель вернула пустой ответ (причина: {finish or 'неизвестна'}). Попробуйте ещё раз."
        )
    return text
