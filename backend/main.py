from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from admin.router import router as admin_router
from customer.router import router as customer_router
from employee.router import router as employee_router

app = FastAPI(
    title="Prazdnik API",
    description="Celebration Management System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(customer_router, prefix="/api/customer", tags=["Customer"])
app.include_router(employee_router, prefix="/api/employee", tags=["Employee"])


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Prazdnik"}
