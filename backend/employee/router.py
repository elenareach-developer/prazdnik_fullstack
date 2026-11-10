from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# Demo tasks. In production, filter these by authenticated employee.
TASKS = [
    {
        "id": 501,
        "order_id": 1024,
        "title": "Prepare birthday decorations",
        "description": "Prepare unicorn-themed decorations.",
        "deadline": "2026-12-19",
        "status": "assigned",
        "comment": None
    },
    {
        "id": 502,
        "order_id": 1024,
        "title": "Confirm activity materials",
        "description": "Check supplies for children's activities.",
        "deadline": "2026-12-19",
        "status": "in_progress",
        "comment": None
    }
]

class StatusUpdate(BaseModel):
    status: str
    comment: Optional[str] = None

ALLOWED_STATUSES = {"assigned", "in_progress", "completed", "blocked"}

@router.get("/tasks")
def get_tasks():
    return TASKS

@router.get("/tasks/{task_id}")
def get_task(task_id: int):
    task = next((item for item in TASKS if item["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.patch("/tasks/{task_id}/status")
def update_task_status(task_id: int, update: StatusUpdate):
    if update.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}"
        )
    task = next((item for item in TASKS if item["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task["status"] = update.status
    if update.comment is not None:
        task["comment"] = update.comment
    return task
