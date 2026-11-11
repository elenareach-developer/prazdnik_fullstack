import copy
import json
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from shared import ideas_store, orders_store  # noqa: E402
from voice import speech_service, voice_agent  # noqa: E402
from voice.conversation_store import store  # noqa: E402
from voice.speech_service import Transcription  # noqa: E402

WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 4000


@pytest.fixture(autouse=True)
def clean_state(monkeypatch):
    """Isolate every test: fresh orders, ideas and conversations; no real STT/LLM."""
    orders_snapshot = copy.deepcopy(orders_store.ORDERS)
    ideas_snapshot = copy.deepcopy(ideas_store.IDEAS)
    store.clear()
    monkeypatch.setattr(speech_service, "_provider_override", None)
    monkeypatch.setattr(voice_agent, "generate_text", _no_llm)
    yield
    orders_store.ORDERS[:] = orders_snapshot
    ideas_store.IDEAS[:] = ideas_snapshot
    store.clear()


def _no_llm(prompt):
    raise AssertionError("LLM must be mocked in this test")


@pytest.fixture
def client():
    return TestClient(main.app)


class FakeSTT:
    def __init__(self, text="Привет", language="ru", error=None):
        self.text, self.language, self.error = text, language, error
        self.calls = 0

    def transcribe(self, data, mime, language):
        self.calls += 1
        if self.error:
            raise self.error
        return Transcription(text=self.text, language=language or self.language)


@pytest.fixture
def fake_stt(monkeypatch):
    def install(**kwargs):
        provider = FakeSTT(**kwargs)
        monkeypatch.setattr(speech_service, "_provider_override", provider)
        return provider
    return install


class FakeLLM:
    """Returns queued answers (dicts are serialised to JSON) and records prompts."""

    def __init__(self, *answers):
        self.answers = list(answers)
        self.prompts = []

    def __call__(self, prompt):
        self.prompts.append(prompt)
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer if isinstance(answer, str) else json.dumps(answer, ensure_ascii=False)


@pytest.fixture
def fake_llm(monkeypatch):
    def install(*answers):
        llm = FakeLLM(*answers)
        monkeypatch.setattr(voice_agent, "generate_text", llm)
        return llm
    return install
