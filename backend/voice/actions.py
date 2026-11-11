"""Validation and execution of actions proposed by the LLM.

The LLM never changes data itself. It may only *propose* an action; the backend
validates it with strict schemas, stores it as pending, and executes it only after
the customer confirms. Only customer-editable fields can be changed.
"""
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, ValidationError, field_validator

from shared import ideas_store
from shared.orders_store import apply_customer_changes

from .schemas import LLMAction

IDEA_CATEGORIES = ("activity", "decor", "food", "entertainment", "other")
_CATEGORY_LABELS = {
    "activity": "активность", "decor": "оформление", "food": "меню",
    "entertainment": "развлечение", "other": "идея",
}
_FIELD_LABELS = {
    "theme": "тема", "preferences": "предпочтения", "wishes": "пожелания",
    "budget": "бюджет", "date": "дата",
}


class AddIdeaData(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    category: Literal["activity", "decor", "food", "entertainment", "other"] = "other"

    @field_validator("category", mode="before")
    @classmethod
    def _known_category(cls, value):
        value = str(value or "other").strip().lower()
        return value if value in IDEA_CATEGORIES else "other"

    @field_validator("title", "description", mode="before")
    @classmethod
    def _strip(cls, value):
        return str(value or "").strip()


class UpdateCelebrationData(BaseModel):
    """Same editable fields as PATCH /api/customer/orders/{id}; unknown keys are dropped."""
    theme: Optional[str] = Field(default=None, max_length=100)
    preferences: Optional[list[str]] = Field(default=None, max_length=20)
    wishes: Optional[str] = Field(default=None, max_length=1000)
    budget: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    date: Optional[str] = None

    @field_validator("date")
    @classmethod
    def _iso_date(cls, value):
        if value is None:
            return value
        date.fromisoformat(value)  # raises ValueError for anything but YYYY-MM-DD
        return value

    @field_validator("preferences")
    @classmethod
    def _clean_preferences(cls, value):
        if value is None:
            return value
        cleaned = [str(item).strip()[:60] for item in value if str(item).strip()]
        return cleaned

    def changes(self) -> dict:
        return self.model_dump(exclude_none=True)


def _format_value(value) -> str:
    if isinstance(value, list):
        return ", ".join(value) or "—"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def validate_action(action: Optional[LLMAction]) -> Optional[dict]:
    """Return a normalised action {type, data, summary} or None if it is missing/invalid."""
    if action is None:
        return None
    try:
        if action.type == "add_idea":
            data = AddIdeaData.model_validate(action.data)
            summary = f"Добавить {_CATEGORY_LABELS[data.category]}: «{data.title}»"
            return {"type": "add_idea", "data": data.model_dump(), "summary": summary}
        if action.type == "update_celebration":
            data = UpdateCelebrationData.model_validate(action.data)
            changes = data.changes()
            if not changes:
                return None
            parts = [f"{_FIELD_LABELS[key]} → {_format_value(value)}" for key, value in changes.items()]
            return {"type": "update_celebration", "data": changes, "summary": "Изменить: " + "; ".join(parts)}
    except (ValidationError, ValueError, TypeError):
        return None
    return None  # any other action type is not allowed


def execute_action(order: dict, action: dict) -> str:
    """Execute a previously validated and confirmed action. Returns a reply for the customer."""
    if action["type"] == "add_idea":
        data = AddIdeaData.model_validate(action["data"])
        text = data.title if not data.description else f"{data.title}. {data.description}"
        ideas_store.add_idea(text, author="Голосовой помощник", order_id=order["id"], category=data.category)
        return f"Готово! Добавила в праздник: «{data.title}»."
    if action["type"] == "update_celebration":
        data = UpdateCelebrationData.model_validate(action["data"])
        apply_customer_changes(order, data.changes())
        return "Готово! Данные праздника обновлены."
    raise ValueError("Unsupported action")
