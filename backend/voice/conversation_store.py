"""Conversation history per celebration.

In-memory implementation for the first version. The interface (get_or_create /
get / append / pending actions) is what a database-backed store must provide later.
"""
import secrets
import threading
from collections import OrderedDict
from dataclasses import dataclass, field

from .errors import CelebrationAccessError

MAX_MESSAGES = 40          # kept per conversation (oldest dropped)
MAX_CONVERSATIONS = 1000   # oldest conversations evicted


@dataclass
class Conversation:
    id: str
    celebration_id: int
    messages: list[dict] = field(default_factory=list)        # {"role": "user"|"assistant", "text": str}
    pending_actions: dict[str, dict] = field(default_factory=dict)

    def append(self, role: str, text: str) -> None:
        self.messages.append({"role": role, "text": text})
        del self.messages[:-MAX_MESSAGES]

    def add_pending(self, action: dict) -> dict:
        action_id = secrets.token_hex(6)
        stored = {**action, "id": action_id}
        self.pending_actions[action_id] = stored
        return stored

    def pop_pending(self, action_id: str) -> dict | None:
        return self.pending_actions.pop(action_id, None)


class InMemoryConversationStore:
    def __init__(self) -> None:
        self._items: "OrderedDict[str, Conversation]" = OrderedDict()
        self._lock = threading.Lock()

    def _check(self, conversation: Conversation, celebration_id: int) -> Conversation:
        if conversation.celebration_id != celebration_id:
            # Never mix dialogs of different celebrations.
            raise CelebrationAccessError("Этот диалог относится к другому празднику")
        return conversation

    def get(self, conversation_id: str, celebration_id: int) -> Conversation | None:
        with self._lock:
            conversation = self._items.get(conversation_id)
            return self._check(conversation, celebration_id) if conversation else None

    def get_or_create(self, conversation_id: str | None, celebration_id: int) -> Conversation:
        with self._lock:
            if conversation_id and conversation_id in self._items:
                self._items.move_to_end(conversation_id)
                return self._check(self._items[conversation_id], celebration_id)
            # Unknown or missing id → start a new conversation with a server-generated id.
            conversation = Conversation(id=secrets.token_urlsafe(12), celebration_id=celebration_id)
            self._items[conversation.id] = conversation
            while len(self._items) > MAX_CONVERSATIONS:
                self._items.popitem(last=False)
            return conversation

    def clear(self) -> None:
        with self._lock:
            self._items.clear()


store = InMemoryConversationStore()
