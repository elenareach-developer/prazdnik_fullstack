from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter()

PACKAGES = [
    {"id": 1, "name": "Birthday Party", "price": 300, "description": "A simple celebration package."},
    {"id": 2, "name": "Premium Party", "price": 500, "description": "A fuller package with activities and decorations."},
]

# Demo in-memory orders. Data resets when the server restarts.
ORDERS = []
_next_order_id = 1025

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
    global _next_order_id
    created = order.model_dump()
    created.update({"id": _next_order_id, "status": "new"})
    _next_order_id += 1
    ORDERS.append(created)
    return {"message": "Order created", "order": created}

@router.get("/orders")
def list_customer_orders():
    # Demo only: in production, return orders belonging to the authenticated customer.
    return ORDERS

@router.get("/orders/{order_id}")
def get_customer_order(order_id: int):
    order = next((item for item in ORDERS if item["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/orders/{order_id}")
def update_customer_order(order_id: int, changes: dict):
    order = next((item for item in ORDERS if item["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    allowed = {"theme", "preferences", "wishes", "budget", "date"}
    for key, value in changes.items():
        if key in allowed:
            order[key] = value
    return order

@router.post("/orders/{order_id}/feedback")
def add_feedback(order_id: int, feedback: dict):
    order = next((item for item in ORDERS if item["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order["feedback"] = feedback
    return {"message": "Feedback saved", "order_id": order_id}
