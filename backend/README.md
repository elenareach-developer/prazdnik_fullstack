# Prazdnik — modular FastAPI backend

Three independent API modules, combined into one FastAPI app:
- Admin: `/api/admin`
- Customer: `/api/customer`
- Employee: `/api/employee`

Supporting modules:
- `ai/` — LLM access (Gemini) and prompts. Used by Admin only; never imports routers.
- `shared/orders_store.py` — shared order data. Admin and Customer read/write the same orders.

## Guest ideas (Customer)

- `GET /api/customer/ideas` → `{"ideas": [{"id", "author", "text"}]}`
- `POST /api/customer/ideas` with `{"author": "", "text": "..."}` (empty author → «Гость»)

In-memory demo list, not linked to a specific order yet.

## AI (Admin)

Create `backend/.env` from `.env.example` and set `GEMINI_API_KEY`
(optional `GEMINI_MODEL`). Without the key the server still starts; AI endpoints return 503.

| Method | Path | What it does |
|---|---|---|
| POST | `/api/admin/orders/{id}/analyze` | Emotional client portrait from the order; saved as `ai_portrait` |
| POST | `/api/admin/orders/{id}/concepts` | 3 concepts (budget / optimal / premium); saved as `ai_concepts` |
| POST | `/api/admin/ai/client-portrait` | Portrait from a manual form (not tied to an order) |
| POST | `/api/admin/ai/concepts` | Concepts from a manual form |

Order endpoints accept an optional body with `client_role`, `location`, `concerns`,
`success_criteria` — extra context that the order itself does not store.

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
Customer/employee access is not authenticated or secured.
Before production, add a database, authentication/authorization, input validation,
and ensure users can only access their own orders/tasks.
