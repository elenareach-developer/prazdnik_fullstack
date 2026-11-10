import os

from dotenv import load_dotenv

load_dotenv()

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


def generate_text(prompt: str) -> str:
    client = _get_client()
    try:
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", DEFAULT_MODEL),
            contents=prompt,
        )
    except Exception as error:
        raise AIGenerationError(f"Ошибка генерации: {error}") from error
    return response.text or ""
