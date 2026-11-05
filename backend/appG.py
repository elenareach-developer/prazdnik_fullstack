import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from google import genai

load_dotenv()

app = FastAPI()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not configured")

client = genai.Client(api_key=api_key)



@app.get("/api/tradition")
async def explain_tradition(
    tradition: str = "Make turkey",
    country: str = "USA",
    occasion: str = "Thanksgiving"
):
    prompt = f"""
    Explain this party tradition:
    Tradition: {tradition}
    Country: {country}
    Occasion: {occasion}
 
    Explain its meaning, history and how people celebrate it. in 20 words
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    return {
        "tradition": tradition,
        "country": country,
        "occasion": occasion,
        "answer": response.text
    }