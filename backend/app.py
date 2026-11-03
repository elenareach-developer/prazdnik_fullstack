from fastapi import FastAPI
from concurrent.futures import ThreadPoolExecutor

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # твой React (Vite)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def get_response():
    return {
        "note": "FastAPI backend работает!"
    }
@app.get("/Anna")
def get_response():
    return {
        "note": "HIIIII"
    }



@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "message": "Привет от FastAPI! Backend работает."
    }


ideas = []
celebration = {}

@app.post("/api/brainstorm")
def brainstorm(data: dict):
    celebration.update(data)
    return {
        "message": "Данные получены!",
        "celebration": celebration
    }

@app.post("/api/ideas")
def add_idea(data: dict):
    idea = {
        "id": len(ideas) + 1,
        "author": data.get("author", "Гость"),
        "text": data.get("text", "")
    }

    ideas.append(idea)

    return {"idea": idea}

@app.get("/api/ideas")
def get_ideas():
    return {"ideas": ideas}

@app.get("/api/plan")
def get_plan():
    return {
        "celebration": celebration,
        "ideas": ideas
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
