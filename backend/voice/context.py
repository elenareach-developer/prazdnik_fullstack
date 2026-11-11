"""Celebration context for the LLM, built from the shared order data.

Only a whitelist of celebration fields is passed. Customer name, admin AI notes
(ai_portrait, ai_concepts, emotions), feedback and other internal data are never sent.
"""
from shared.ideas_store import list_ideas

# order field -> context key
_FIELDS = {
    "id": "celebration_id",
    "title": "title",
    "celebration_type": "type",
    "date": "date",
    "time": "time",
    "location": "location",
    "children_count": "guests_count",
    "child_age": "celebrant_age",
    "budget": "budget",
    "theme": "theme",
    "preferences": "preferences",
    "wishes": "wishes",
    "status": "status",
}


def build_celebration_context(order: dict) -> dict:
    context = {}
    for source, target in _FIELDS.items():
        value = order.get(source)
        if value not in (None, "", []):
            context[target] = value
    ideas = [
        {key: idea[key] for key in ("text", "category") if idea.get(key)}
        for idea in list_ideas(order_id=order["id"])
    ]
    context["ideas"] = ideas
    return context
