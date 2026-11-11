"""Shared in-memory guest ideas, used by Customer API and the Voice Assistant.

Demo only: data resets when the server restarts. Replace with a database later.
"""
from typing import Optional

IDEAS: list[dict] = []
_next_idea_id = 1


def add_idea(text: str, author: str = "", order_id: Optional[int] = None,
             category: Optional[str] = None) -> dict:
    global _next_idea_id
    idea = {"id": _next_idea_id, "author": author.strip() or "Гость", "text": text.strip()}
    if order_id is not None:
        idea["order_id"] = order_id
    if category:
        idea["category"] = category
    _next_idea_id += 1
    IDEAS.append(idea)
    return idea


def list_ideas(order_id: Optional[int] = None) -> list[dict]:
    if order_id is None:
        return IDEAS
    return [idea for idea in IDEAS if idea.get("order_id") == order_id]
