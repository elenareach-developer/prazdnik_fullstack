"""Single place that decides whether the caller may use a celebration.

DEMO MODE: the project has no authentication yet, so any caller may access any
existing celebration. When customer login is added, verify here that the
authenticated customer owns the order and raise CelebrationAccessError otherwise.
Do NOT trust a role or customer id sent by the frontend.
"""
from fastapi import HTTPException

from shared.orders_store import find_order


def ensure_celebration_access(celebration_id: int) -> dict:
    order = find_order(celebration_id)
    if not order:
        raise HTTPException(status_code=404, detail="Праздник не найден")
    # TODO(auth): check order ownership against the authenticated customer.
    return order
