from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from shared import ideas_store
from shared.orders_store import ORDERS, add_order, apply_customer_changes, find_order

router = APIRouter()

PACKAGES = [
    {"id": 1, "name": "Birthday Party", "price": 300, "description": "A simple celebration package."},
    {"id": 2, "name": "Premium Party", "price": 500, "description": "A fuller package with activities and decorations."},
]

class OrderCreate(BaseModel):
    celebration_type: str = "Birthday"
    child_age: Optional[int] = Field(default=None, ge=0, le=120)
    children_count: int = Field(default=1, ge=1)
    date: str
    budget: float = Field(gt=0)
    theme: Optional[str] = None
    preferences: List[str] = []
    wishes: str = ""

@router.get("/packages")
def get_packages():
    return PACKAGES

@router.get("/packages/{package_id}")
def get_package(package_id: int):
    package = next((item for item in PACKAGES if item["id"] == package_id), None)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return package

@router.post("/orders")
def create_order(order: OrderCreate):
    created = add_order(order.model_dump())
    return {"message": "Order created", "order": created}

@router.get("/orders")
def list_customer_orders():
    # Demo only: in production, return orders belonging to the authenticated customer.
    return ORDERS

@router.get("/orders/{order_id}")
def get_customer_order(order_id: int):
    order = find_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/orders/{order_id}")
def update_customer_order(order_id: int, changes: dict):
    order = find_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return apply_customer_changes(order, changes)

@router.post("/orders/{order_id}/feedback")
def add_feedback(order_id: int, feedback: dict):
    order = find_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order["feedback"] = feedback
    return {"message": "Feedback saved", "order_id": order_id}


# Guest ideas are stored in shared/ideas_store.py (also used by the Voice Assistant).


class IdeaCreate(BaseModel):
    author: str = Field(default="", max_length=60)
    text: str = Field(min_length=1, max_length=1000)


@router.get("/ideas")
def list_ideas():
    return {"ideas": ideas_store.list_ideas()}


@router.post("/ideas")
def add_idea(idea: IdeaCreate):
    if not idea.text.strip():
        raise HTTPException(status_code=422, detail="Текст идеи не может быть пустым")
    created = ideas_store.add_idea(idea.text, idea.author)
    return {"message": "Спасибо! Идея добавлена 🌸", "idea": created}
