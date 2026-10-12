import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.ai_service import AIService
from backend.schemas import ResetRequest

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "provider" in data
        assert "model" in data
        assert "mock_mode" in data

@pytest.mark.asyncio
async def test_generate_reset_valid_mock_mode():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "check_in": "Debugging for 2 hours, shoulders are tense and feeling frustrated.",
            "environment_preference": "either",
            "activity_preference": "gentle_movement"
        }
        response = await client.post("/api/generate-reset", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "activity_title" in data
        assert data["duration_minutes"] == 5
        assert data["category"] in ["Gentle Movement", "Nature", "Sensory Grounding"]
        assert len(data["instruction"]) > 10
        assert len(data["reason"]) > 5

@pytest.mark.asyncio
async def test_generate_reset_empty_checkin_validation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "check_in": "  ",
            "environment_preference": "indoors",
            "activity_preference": "nature"
        }
        response = await client.post("/api/generate-reset", json=payload)
        assert response.status_code == 422

@pytest.mark.asyncio
async def test_ai_service_fallback_on_network_failure(monkeypatch):
    # Simulate a network failure in AI provider
    service = AIService(api_key="fake-key-for-test", base_url="https://invalid-test-domain.groq.com/v1")
    
    req = ResetRequest(
        check_in="Stuck in an endless email loop and eyes feel tired",
        environment_preference="outdoors",
        activity_preference="nature"
    )
    result = await service.generate_reset(req)
    assert result is not None
    assert result.duration_minutes == 5
    assert result.activity_title
    assert result.instruction

@pytest.mark.asyncio
async def test_ai_service_sends_api_key_as_bearer_token(monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "choices": [{
                    "message": {
                        "content": (
                            '{"activity_title":"Step outside","duration_minutes":5,'
                            '"category":"Nature","instruction":"Notice three things nearby.",'
                            '"reason":"A brief change of scene can help."}'
                        )
                    }
                }]
            }

    async def fake_post(*args, **kwargs):
        captured.update(kwargs)
        return FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", fake_post)
    service = AIService(api_key="test-api-key", base_url="https://api.groq.com/openai/v1")
    request = ResetRequest(
        check_in="Feeling overwhelmed after a long work session",
        environment_preference="outdoors",
        activity_preference="nature"
    )

    await service.generate_reset(request)

    assert captured["headers"]["Authorization"] == "Bearer test-api-key"

@pytest.mark.asyncio
async def test_ai_service_fallback_on_malformed_response(monkeypatch):
    # Simulate AI returning invalid JSON
    class FakeResponse:
        status_code = 200
        def json(self):
            return {"choices": [{"message": {"content": "This is not json at all!"}}]}

    async def fake_post(*args, **kwargs):
        return FakeResponse()

    service = AIService(api_key="test-key", base_url="https://api.groq.com/openai/v1")
    monkeypatch.setattr("httpx.AsyncClient.post", fake_post)

    req = ResetRequest(
        check_in="Mentally saturated after code review",
        environment_preference="indoors",
        activity_preference="sensory_grounding"
    )
    result = await service.generate_reset(req)
    assert result is not None
    assert result.duration_minutes == 5
    assert result.activity_title
    assert result.instruction
