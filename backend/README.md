# Prazdnik — modular FastAPI backend

Three independent API modules, combined into one FastAPI app:
- Admin: `/api/admin`
- Customer: `/api/customer`
- Employee: `/api/employee`

## Run locally

From this `backend` directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

Open API docs: http://localhost:8000/docs  
Health check: http://localhost:8000/api/health

## Notes

This starter uses demo/in-memory data. Data resets when the server restarts.
The admin module has a placeholder emotional profile and placeholder analyze endpoint;
it does not call an LLM yet. Customer/employee access is not authenticated or secured.
Before production, add a database, authentication/authorization, input validation,
and ensure users can only access their own orders/tasks.
