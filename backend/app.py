
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai

load_dotenv()

app = FastAPI(title="Праздник — Emotional Client Portrait")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini client
api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key) if api_key else None


class CelebrationData(BaseModel):
    client_role: str = "Заказчик"
    event: str
    celebrant_age: str = ""
    theme: str = ""
    guests: str = ""
    location: str = ""
    budget: str = ""
    wishes: str = ""
    concerns: str = ""
    success_criteria: str = ""


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/client-portrait")
def create_client_portrait(data: CelebrationData):

    if client is None:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY не найден в backend/.env"
        )

    prompt = f"""
Ты — интеграционный профессор и эксперт по анализу
клиентского опыта в сфере организации праздников.

Твоя задача — создать эмоциональный портрет заказчика
на основе предоставленной информации.

ВАЖНО:
1. Не ставь психологических диагнозов.
2. Не утверждай скрытые мотивы как факты.
3. Разделяй факты, интерпретации и гипотезы.
4. Не используй шаблонные характеристики личности.
5. Анализируй человеческую потребность, стоящую за заказом.

ИНФОРМАЦИЯ О ПРАЗДНИКЕ:

Роль заказчика: {data.client_role}
Событие: {data.event}
Возраст виновника торжества: {data.celebrant_age}
Тема: {data.theme}
Гости: {data.guests}
Место: {data.location}
Бюджет: {data.budget}
Пожелания: {data.wishes}
Опасения: {data.concerns}
Критерии успеха: {data.success_criteria}

СОЗДАЙ ЭМОЦИОНАЛЬНЫЙ ПОРТРЕТ:

1. ФАКТЫ
Что заказчик прямо сообщил.

2. ЭМОЦИОНАЛЬНАЯ ПОТРЕБНОСТЬ
Что для него может быть эмоционально важно.

3. ЖЕЛАЕМЫЙ РЕЗУЛЬТАТ
Какие чувства он хочет испытать сам
и какие чувства хочет вызвать у гостей.

4. СТРАХИ И ОПАСЕНИЯ
Что может испортить впечатление от праздника.

5. СОЦИАЛЬНЫЙ ОБРАЗ
Как заказчик хочет выглядеть в глазах окружающих.
Укажи, если это только гипотеза.

6. КРИТЕРИИ УСПЕХА
По каким признакам заказчик поймет,
что праздник получился.

7. РЕКОМЕНДАЦИИ ОРГАНИЗАТОРУ
Как общаться с заказчиком.
Что предложить.
На чем нельзя экономить внимание.

8. ГЛАВНАЯ ЭМОЦИОНАЛЬНАЯ ФОРМУЛА
Закончи одним предложением:
"На самом деле заказчик хочет не просто ..., 
а хочет почувствовать ..."

Пиши на русском языке.
Будь конкретным, деликатным и практичным.
"""

    try:
        response = client.models.generate_content(
            model=os.getenv(
                "GEMINI_MODEL",
                "gemini-3.5-flash-lite"
            ),
            contents=prompt
        )

        return {
            "client_portrait": response.text
        }

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Ошибка генерации: {str(error)}"
        )
