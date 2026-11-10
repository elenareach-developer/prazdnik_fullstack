from fastapi import APIRouter, HTTPException

router = APIRouter()

# Demo data. Replace with database queries when ready.
ORDERS = [
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
    order = next((item for item in ORDERS if item["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.get("/orders/{order_id}/emotions")
def get_emotions(order_id: int):
    order = next((item for item in ORDERS if item["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order["emotions"]

@router.post("/orders/{order_id}/analyze")
def analyze_order(order_id: int):
    # Placeholder endpoint. Connect an LLM in a service module later.
    order = next((item for item in ORDERS if item["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "order_id": order_id,
        "status": "demo",
        "message": "This is placeholder analysis. Connect your LLM here.",
        "emotions": order["emotions"]
    }
