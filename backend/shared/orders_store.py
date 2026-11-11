"""Shared in-memory order storage used by Admin and Customer modules.

Demo only: data resets when the server restarts. Replace with a database later.
"""
from typing import Optional

ORDERS: list[dict] = [
    {
        "id": 1024,
        "customer": "Demo Customer",
        "celebration_type": "Birthday",
        "date": "2026-12-20",
        "budget": 500,
        "status": "new",
        "emotions": {
            "signals": ["high expectations", "some anxiety", "excitement"],
            "summary": "The customer wants the child to feel special and the event to run smoothly.",
            "recommendation": "Share a clear schedule and confirm the key details in advance.",
            "basis": "Demo interpretation based on the customer's stated wishes; not a psychological assessment."
        }
    }
]

_next_order_id = 1025


def find_order(order_id: int) -> Optional[dict]:
    return next((item for item in ORDERS if item["id"] == order_id), None)


def add_order(data: dict) -> dict:
    global _next_order_id
    created = dict(data)
    created.update({"id": _next_order_id, "status": "new"})
    _next_order_id += 1
    ORDERS.append(created)
    return created


# Fields a customer may change (same rule as PATCH /api/customer/orders/{id}).
CUSTOMER_EDITABLE_FIELDS = {"theme", "preferences", "wishes", "budget", "date"}


def apply_customer_changes(order: dict, changes: dict) -> dict:
    """Apply only customer-editable fields; anything else is ignored."""
    for key, value in changes.items():
        if key in CUSTOMER_EDITABLE_FIELDS:
            order[key] = value
    return order
