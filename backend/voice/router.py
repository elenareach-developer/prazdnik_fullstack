from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from ai.llm_client import AIGenerationError, AIUnavailableError

from . import speech_service
from .access import ensure_celebration_access
from .actions import execute_action, validate_action
from .context import build_celebration_context
from .conversation_store import store
from .errors import VoiceError
from .schemas import (
    ChatRequest,
    ChatResponse,
    ConfirmRequest,
    ConfirmResponse,
    PendingAction,
    TranscribeResponse,
)
from .voice_agent import ask_assistant

router = APIRouter()

MODIFYING_ACTIONS = {"add_idea", "update_celebration"}


def _http(error: VoiceError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.message)


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(audio: UploadFile = File(...), language: Optional[str] = Form(default=None)):
    """Speech-to-Text. Accepts one audio file (multipart field `audio`), optional language ru|en."""
    limit = speech_service.max_audio_bytes()
    data = await audio.read(limit + 1)   # never read more than the limit into memory
    try:
        result = await run_in_threadpool(speech_service.transcribe_audio, data, audio.content_type, language)
    except VoiceError as error:
        raise _http(error)
    finally:
        await audio.close()
    return TranscribeResponse(transcript=result.text, language=result.language)


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """Recognised text + celebration context → LLM → validated (pending) action."""
    order = ensure_celebration_access(request.celebration_id)
    try:
        conversation = store.get_or_create(request.conversation_id, request.celebration_id)
    except VoiceError as error:
        raise _http(error)

    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Сообщение пустое")

    context = build_celebration_context(order)
    try:
        llm = ask_assistant(context, conversation.messages, message)
    except AIUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error))
    except AIGenerationError as error:
        raise HTTPException(status_code=502, detail=str(error))
    except VoiceError as error:
        raise _http(error)

    pending = None
    action = validate_action(llm.action) if llm.intent in MODIFYING_ACTIONS or llm.action else None
    if action and action["type"] in MODIFYING_ACTIONS:
        # Every data change requires explicit confirmation, whatever the LLM said.
        pending = PendingAction(**conversation.add_pending(action))

    conversation.append("user", message)
    conversation.append("assistant", llm.reply)

    intent = llm.intent
    if intent in MODIFYING_ACTIONS and pending is None:
        intent = "answer"   # the proposed action was invalid and was dropped

    return ChatResponse(
        conversation_id=conversation.id,
        transcript=message,
        reply=llm.reply,
        intent=intent,
        action=pending,
        requires_confirmation=pending is not None,
    )


@router.post("/actions/confirm", response_model=ConfirmResponse)
def confirm_action(request: ConfirmRequest):
    """Customer confirms or cancels a pending action. Only then is data changed."""
    order = ensure_celebration_access(request.celebration_id)
    try:
        conversation = store.get(request.conversation_id, request.celebration_id)
    except VoiceError as error:
        raise _http(error)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Диалог не найден. Начните разговор заново.")

    action = conversation.pop_pending(request.action_id)
    if action is None:
        raise HTTPException(status_code=404, detail="Действие не найдено или уже выполнено")

    if request.confirm:
        reply = execute_action(order, action)
    else:
        reply = "Хорошо, ничего не меняю."
    conversation.append("assistant", reply)
    return ConfirmResponse(
        conversation_id=conversation.id,
        reply=reply,
        applied=request.confirm,
        action=PendingAction(**action),
    )
