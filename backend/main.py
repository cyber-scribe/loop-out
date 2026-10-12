import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.config import CORS_ORIGINS, AI_MODEL, AI_PROVIDER
from backend.schemas import ResetRequest, ResetResponse, HealthResponse
from backend.ai_service import ai_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("loopout.main")

app = FastAPI(
    title="LoopOut API",
    description="Backend API for LoopOut — personalized five-minute offline resets",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint providing service status and AI configuration details."""
    return HealthResponse(
        status="healthy",
        provider=AI_PROVIDER,
        model=AI_MODEL,
        mock_mode=ai_service.is_mock_mode
    )

@app.post("/api/generate-reset", response_model=ResetResponse)
async def generate_reset(request: ResetRequest):
    """
    Generate one personalized, five-minute offline reset.
    Validates user check-in, environment and activity preferences.
    """
    # Strict validation of input
    cleaned_check_in = request.check_in.strip()
    if len(cleaned_check_in) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Check-in text must contain at least 3 characters describing what is happening."
        )

    try:
        reset = await ai_service.generate_reset(request)
        return reset
    except Exception as exc:
        logger.exception(f"Unexpected error in generate_reset: {exc}")
        # Always return safe fallback even on system failure
        from backend.fallbacks import get_fallback_reset
        return get_fallback_reset(
            environment_preference=request.environment_preference,
            activity_preference=request.activity_preference,
            user_context=request.check_in,
            excluded_activity_titles=request.excluded_activity_titles,
        )

if __name__ == "__main__":
    import uvicorn
    from backend.config import PORT
    uvicorn.run("backend.main:app", host="0.0.0.0", port=PORT, reload=True)
