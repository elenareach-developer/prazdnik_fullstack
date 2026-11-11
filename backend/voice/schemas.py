from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

Intent = Literal[
    "answer",
    "ask_question",
    "add_idea",
    "update_celebration",
    "get_celebration_info",
    "suggest_activity",
]

CONVERSATION_ID_PATTERN = r"^[A-Za-z0-9_-]{8,64}$"


# ---------- LLM output (validated before anything else happens) ----------

class LLMAction(BaseModel):
    type: str
    data: dict[str, Any] = Field(default_factory=dict)


class LLMReply(BaseModel):
    reply: str = Field(min_length=1, max_length=1500)
    intent: Intent = "answer"
    action: Optional[LLMAction] = None
    requires_confirmation: bool = False


# ---------- API ----------

class TranscribeResponse(BaseModel):
    transcript: str
    language: Optional[str] = None


class ChatRequest(BaseModel):
    celebration_id: int
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(default=None, pattern=CONVERSATION_ID_PATTERN)


class PendingAction(BaseModel):
    id: str
    type: Literal["add_idea", "update_celebration"]
    data: dict[str, Any]
    summary: str


class ChatResponse(BaseModel):
    conversation_id: str
    transcript: str
    reply: str
    intent: Intent
    action: Optional[PendingAction] = None
    requires_confirmation: bool = False


class ConfirmRequest(BaseModel):
    celebration_id: int
    conversation_id: str = Field(pattern=CONVERSATION_ID_PATTERN)
    action_id: str = Field(min_length=1, max_length=64)
    confirm: bool


class ConfirmResponse(BaseModel):
    conversation_id: str
    reply: str
    applied: bool
    action: PendingAction
