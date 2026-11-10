from datetime import datetime, timezone

from . import prompts
from .llm_client import generate_text


def order_to_celebration_data(order: dict, extra: dict | None = None) -> dict:
    """Map shared order fields to prompt fields. Only real order data is used;
    fields the order doesn't have stay empty unless the admin supplies them."""
    preferences = order.get("preferences") or []
    wishes_parts = [order.get("wishes") or ""]
    if preferences:
        wishes_parts.append("Предпочтения: " + ", ".join(map(str, preferences)))

    data = {
        "client_role": "",
        "event": order.get("celebration_type", ""),
        "celebrant_age": order.get("child_age", ""),
        "theme": order.get("theme", ""),
        "guests": (f"{order['children_count']} детей" if order.get("children_count") else ""),
        "location": "",
        "budget": order.get("budget", ""),
        "wishes": ". ".join(p for p in wishes_parts if p),
        "concerns": "",
        "success_criteria": "",
    }
    for key, value in (extra or {}).items():
        if value not in (None, ""):
            data[key] = value
    return data


def _result(text: str) -> dict:
    return {"text": text, "generated_at": datetime.now(timezone.utc).isoformat()}


def generate_client_portrait(data: dict) -> dict:
    return _result(generate_text(prompts.client_portrait_prompt(data)))


def generate_concepts(data: dict) -> dict:
    return _result(generate_text(prompts.concepts_prompt(data)))
