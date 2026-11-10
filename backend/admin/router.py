from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai import service as ai_service
from ai.llm_client import AIGenerationError, AIUnavailableError
from shared.orders_store import ORDERS, find_order

router = APIRouter()


class CelebrationData(BaseModel):
    """Free-form celebration description (same fields as backend-1 example)."""
    client_role: str = ""
    event: str
    celebrant_age: str = ""
    theme: str = ""
    guests: str = ""
    location: str = ""
    budget: str = ""
    wishes: str = ""
    concerns: str = ""
    success_criteria: str = ""


class OrderAIContext(BaseModel):
    """Optional details the admin knows but the order doesn't store yet."""
    client_role: Optional[str] = None
    location: Optional[str] = None
    concerns: Optional[str] = None
    success_criteria: Optional[str] = None


def _get_order_or_404(order_id: int) -> dict:
    order = find_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def _run_ai(func, data: dict) -> dict:
    try:
        return func(data)
    except AIUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error))
    except AIGenerationError as error:
        raise HTTPException(status_code=502, detail=str(error))


@router.get("/dashboard")
def dashboard():
    return {
        "orders_count": len(ORDERS),
        "new_orders": sum(1 for order in ORDERS if order["status"] == "new"),
        "demo_revenue": 5000
    }


@router.get("/orders")
def get_orders():
    return ORDERS


@router.get("/orders/{order_id}")
def get_order(order_id: int):
    return _get_order_or_404(order_id)


@router.get("/orders/{order_id}/emotions")
def get_emotions(order_id: int):
    order = _get_order_or_404(order_id)
    if "emotions" not in order:
        raise HTTPException(status_code=404, detail="Emotions not available for this order")
    return order["emotions"]


@router.post("/orders/{order_id}/analyze")
def analyze_order(order_id: int, context: Optional[OrderAIContext] = None):
    """Generate an AI emotional client portrait from the shared order data."""
    order = _get_order_or_404(order_id)
    extra = context.model_dump() if context else None
    data = ai_service.order_to_celebration_data(order, extra)
    portrait = _run_ai(ai_service.generate_client_portrait, data)
    order["ai_portrait"] = portrait
    return {"order_id": order_id, "status": "generated", "client_portrait": portrait}


@router.post("/orders/{order_id}/concepts")
def order_concepts(order_id: int, context: Optional[OrderAIContext] = None):
    """Generate 3 celebration concepts (budget / optimal / premium) for an order."""
    order = _get_order_or_404(order_id)
    extra = context.model_dump() if context else None
    data = ai_service.order_to_celebration_data(order, extra)
    concepts = _run_ai(ai_service.generate_concepts, data)
    order["ai_concepts"] = concepts
    return {"order_id": order_id, "status": "generated", "concepts": concepts}


@router.post("/ai/client-portrait")
def ai_client_portrait(data: CelebrationData):
    """Emotional portrait from a manually filled form (not tied to an order)."""
    return {"client_portrait": _run_ai(ai_service.generate_client_portrait, data.model_dump())}


@router.post("/ai/concepts")
def ai_concepts(data: CelebrationData):
    """3 concepts from a manually filled form (not tied to an order)."""
    return {"concepts": _run_ai(ai_service.generate_concepts, data.model_dump())}
