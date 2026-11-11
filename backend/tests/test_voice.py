from ai.llm_client import AIUnavailableError
from shared import ideas_store, orders_store
from voice.errors import STTError, STTUnavailableError

from .conftest import WEBM

ORDER_ID = 1024


def upload(client, data=WEBM, mime="audio/webm;codecs=opus", **form):
    return client.post("/api/voice/transcribe", files={"audio": ("voice.webm", data, mime)}, data=form)


def chat(client, message="Привет!", conversation_id=None, celebration_id=ORDER_ID):
    body = {"celebration_id": celebration_id, "message": message}
    if conversation_id:
        body["conversation_id"] = conversation_id
    return client.post("/api/voice/chat", json=body)


ADD_IDEA = {
    "reply": "Предлагаю поиск сокровищ. Добавить?",
    "intent": "add_idea",
    "action": {"type": "add_idea", "data": {
        "title": "Поиск сокровищ", "category": "activity", "description": "Командная игра для детей"}},
    "requires_confirmation": True,
}


# ------------------------------------------------------------- Speech-to-Text

def test_transcribe_success(client, fake_stt):
    stt = fake_stt(text="Хочу конкурс по поиску сокровищ", language="ru")
    response = upload(client)
    assert response.status_code == 200
    assert response.json() == {"transcript": "Хочу конкурс по поиску сокровищ", "language": "ru"}
    assert stt.calls == 1


def test_transcribe_english_language_hint(client, fake_stt):
    fake_stt(text="I want a pirate party", language="en")
    response = upload(client, language="en")
    assert response.status_code == 200
    assert response.json()["language"] == "en"


def test_transcribe_unsupported_language(client, fake_stt):
    fake_stt()
    assert upload(client, language="de").status_code == 400


def test_transcribe_empty_audio(client, fake_stt):
    stt = fake_stt()
    assert upload(client, data=b"").status_code == 400
    assert upload(client, data=b"\x1a\x45\xdf\xa3").status_code == 400
    assert stt.calls == 0


def test_transcribe_corrupted_audio(client, fake_stt):
    stt = fake_stt()
    response = upload(client, data=b"not really audio" * 200)
    assert response.status_code == 400
    assert "повреждён" in response.json()["detail"]
    assert stt.calls == 0


def test_transcribe_wrong_mime(client, fake_stt):
    assert upload(client, mime="text/plain").status_code == 415


def test_transcribe_too_large(client, fake_stt, monkeypatch):
    monkeypatch.setenv("VOICE_MAX_AUDIO_MB", "0.001")
    assert upload(client).status_code == 413


def test_transcribe_stt_error(client, fake_stt):
    fake_stt(error=STTError("Не удалось распознать аудио."))
    response = upload(client)
    assert response.status_code == 502
    assert response.json()["detail"] == "Не удалось распознать аудио."


def test_transcribe_stt_not_configured(client, fake_stt):
    fake_stt(error=STTUnavailableError("STT_API_KEY не найден"))
    assert upload(client).status_code == 503


def test_transcribe_no_speech(client, fake_stt):
    fake_stt(text="   ")
    assert upload(client).status_code == 422


# ------------------------------------------------------------- Chat + LLM

def test_chat_success_uses_context_without_private_data(client, fake_llm):
    order = orders_store.find_order(ORDER_ID)
    order["ai_portrait"] = {"text": "SECRET ADMIN NOTE"}
    llm = fake_llm({"reply": "Праздник 20 декабря, бюджет 500.", "intent": "get_celebration_info",
                    "action": None, "requires_confirmation": False})

    response = chat(client, "Когда мой праздник?")
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Праздник 20 декабря, бюджет 500."
    assert body["intent"] == "get_celebration_info"
    assert body["transcript"] == "Когда мой праздник?"
    assert body["action"] is None and body["requires_confirmation"] is False
    assert body["conversation_id"]

    prompt = llm.prompts[0]
    assert '"celebration_id": 1024' in prompt and '"budget": 500' in prompt
    assert "SECRET ADMIN NOTE" not in prompt
    assert "Demo Customer" not in prompt


def test_chat_remembers_history(client, fake_llm):
    llm = fake_llm(
        {"reply": "Какая тема?", "intent": "ask_question"},
        {"reply": "Пираты — отлично!", "intent": "answer"},
    )
    first = chat(client, "Хочу праздник для сына").json()
    chat(client, "Пираты", conversation_id=first["conversation_id"])
    assert "Хочу праздник для сына" in llm.prompts[1]
    assert "Какая тема?" in llm.prompts[1]


def test_chat_json_in_markdown_fence(client, fake_llm):
    fake_llm('```json\n{"reply": "Конечно!", "intent": "answer", "action": null}\n```')
    assert chat(client).json()["reply"] == "Конечно!"


def test_chat_invalid_json_retries_then_fails(client, fake_llm):
    llm = fake_llm("Это не JSON", '{"reply": "", "intent": "unknown"}')
    response = chat(client)
    assert response.status_code == 502
    assert "формате" in response.json()["detail"]
    assert len(llm.prompts) == 2


def test_chat_invalid_json_then_valid(client, fake_llm):
    fake_llm("oops", {"reply": "Готова помочь!", "intent": "answer"})
    assert chat(client).json()["reply"] == "Готова помочь!"


def test_chat_llm_unavailable(client, fake_llm):
    fake_llm(AIUnavailableError("GEMINI_API_KEY не найден в backend/.env"))
    assert chat(client).status_code == 503


# ------------------------------------------------------------- access

def test_chat_unknown_celebration(client, fake_llm):
    assert chat(client, celebration_id=999999).status_code == 404


def test_conversation_of_another_celebration_is_rejected(client, fake_llm):
    other = orders_store.add_order({"celebration_type": "Wedding", "date": "2027-06-01", "budget": 900})
    fake_llm({"reply": "Привет!", "intent": "answer"})
    conversation_id = chat(client).json()["conversation_id"]   # belongs to 1024

    response = chat(client, conversation_id=conversation_id, celebration_id=other["id"])
    assert response.status_code == 403

    confirm = client.post("/api/voice/actions/confirm", json={
        "celebration_id": other["id"], "conversation_id": conversation_id, "action_id": "x", "confirm": True})
    assert confirm.status_code == 403


# ------------------------------------------------------------- actions

def test_add_idea_only_after_confirmation(client, fake_llm):
    fake_llm(ADD_IDEA)
    body = chat(client, "Хочу добавить конкурс по поиску сокровищ").json()
    assert body["intent"] == "add_idea"
    assert body["requires_confirmation"] is True
    assert body["action"]["type"] == "add_idea"
    assert "Поиск сокровищ" in body["action"]["summary"]
    assert ideas_store.list_ideas(order_id=ORDER_ID) == []          # nothing changed yet

    confirm = client.post("/api/voice/actions/confirm", json={
        "celebration_id": ORDER_ID, "conversation_id": body["conversation_id"],
        "action_id": body["action"]["id"], "confirm": True})
    assert confirm.status_code == 200 and confirm.json()["applied"] is True

    ideas = ideas_store.list_ideas(order_id=ORDER_ID)
    assert len(ideas) == 1
    assert ideas[0]["text"] == "Поиск сокровищ. Командная игра для детей"
    assert ideas[0]["category"] == "activity"

    again = client.post("/api/voice/actions/confirm", json={
        "celebration_id": ORDER_ID, "conversation_id": body["conversation_id"],
        "action_id": body["action"]["id"], "confirm": True})
    assert again.status_code == 404                               # cannot be executed twice


def test_added_idea_appears_in_next_context(client, fake_llm):
    llm = fake_llm(ADD_IDEA, {"reply": "Уже есть поиск сокровищ.", "intent": "answer"})
    body = chat(client).json()
    client.post("/api/voice/actions/confirm", json={
        "celebration_id": ORDER_ID, "conversation_id": body["conversation_id"],
        "action_id": body["action"]["id"], "confirm": True})
    chat(client, "Какие идеи уже есть?", conversation_id=body["conversation_id"])
    assert "Поиск сокровищ. Командная игра для детей" in llm.prompts[1]


def test_cancelled_action_changes_nothing(client, fake_llm):
    fake_llm(ADD_IDEA)
    body = chat(client).json()
    response = client.post("/api/voice/actions/confirm", json={
        "celebration_id": ORDER_ID, "conversation_id": body["conversation_id"],
        "action_id": body["action"]["id"], "confirm": False})
    assert response.json()["applied"] is False
    assert ideas_store.list_ideas(order_id=ORDER_ID) == []


def test_action_always_requires_confirmation(client, fake_llm):
    fake_llm({**ADD_IDEA, "requires_confirmation": False})
    body = chat(client).json()
    assert body["requires_confirmation"] is True
    assert ideas_store.list_ideas(order_id=ORDER_ID) == []


def test_update_celebration_only_allowed_fields(client, fake_llm):
    fake_llm({"reply": "Поднять бюджет до 700?", "intent": "update_celebration",
              "action": {"type": "update_celebration",
                         "data": {"budget": 700, "status": "paid", "customer": "Hacker"}},
              "requires_confirmation": True})
    body = chat(client, "Увеличь бюджет до 700").json()
    assert body["action"]["data"] == {"budget": 700.0}

    client.post("/api/voice/actions/confirm", json={
        "celebration_id": ORDER_ID, "conversation_id": body["conversation_id"],
        "action_id": body["action"]["id"], "confirm": True})
    order = orders_store.find_order(ORDER_ID)
    assert order["budget"] == 700
    assert order["status"] == "new" and order["customer"] == "Demo Customer"


def test_invalid_action_is_dropped(client, fake_llm):
    fake_llm({"reply": "Перенесу праздник.", "intent": "update_celebration",
              "action": {"type": "update_celebration", "data": {"date": "завтра"}},
              "requires_confirmation": True})
    body = chat(client).json()
    assert body["action"] is None
    assert body["intent"] == "answer"


def test_unknown_action_type_is_dropped(client, fake_llm):
    fake_llm({"reply": "Удаляю заказ", "intent": "answer",
              "action": {"type": "run_sql", "data": {"query": "DROP TABLE orders"}}})
    body = chat(client).json()
    assert body["action"] is None


# ------------------------------------------------------------- regressions

def test_customer_ideas_api_still_works(client):
    response = client.post("/api/customer/ideas", json={"author": "", "text": "Фонарики"})
    assert response.status_code == 200
    assert response.json()["idea"]["author"] == "Гость"
    assert any(idea["text"] == "Фонарики" for idea in client.get("/api/customer/ideas").json()["ideas"])


def test_customer_patch_still_filters_fields(client):
    client.patch(f"/api/customer/orders/{ORDER_ID}", json={"theme": "Космос", "status": "paid"})
    order = orders_store.find_order(ORDER_ID)
    assert order["theme"] == "Космос" and order["status"] == "new"


def test_faster_whisper_model_load_failure_is_friendly(client, monkeypatch):
    import sys
    import types

    from voice import speech_service

    class BrokenModel:
        def __init__(self, *args, **kwargs):
            raise OSError("download blocked")

    monkeypatch.setitem(sys.modules, "faster_whisper", types.SimpleNamespace(WhisperModel=BrokenModel))
    monkeypatch.setenv("STT_PROVIDER", "faster_whisper")
    monkeypatch.setattr(speech_service, "_PROVIDERS", {})
    response = upload(client)
    assert response.status_code == 503
    assert "не загрузилась" in response.json()["detail"]


def test_openai_provider_without_key(client, monkeypatch):
    from voice import speech_service

    monkeypatch.setenv("STT_PROVIDER", "openai_whisper")
    monkeypatch.delenv("STT_API_KEY", raising=False)
    monkeypatch.setattr(speech_service, "_PROVIDERS", {})
    response = upload(client)
    assert response.status_code == 503
    assert "STT_API_KEY" in response.json()["detail"]
