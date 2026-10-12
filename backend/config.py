import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

AI_API_KEY: str = os.getenv("AI_API_KEY", "").strip()
AI_API_BASE_URL: str = os.getenv("AI_API_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
AI_MODEL: str = os.getenv("AI_MODEL", "openai/gpt-oss-20b").strip()
AI_PROVIDER: str = os.getenv("AI_PROVIDER", "groq").strip()

PORT: int = int(os.getenv("PYTHON_PORT", os.getenv("PORT", "8000")))

raw_cors = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173")
CORS_ORIGINS: List[str] = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
