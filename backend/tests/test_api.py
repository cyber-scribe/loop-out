import json
import pytest
import httpx
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.ai_service import AIService, GROUNDED_REASONS, normalize_instruction
from backend.fallbacks import FALLBACK_ACTIVITIES, get_fallback_reset
from backend.prompts import SYSTEM_PROMPT, build_user_prompt
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
async def test_generate_reset_valid_mock_mode(monkeypatch):
    async def generate_local_fallback(request):
        return get_fallback_reset(
            environment_preference=request.environment_preference,
            activity_preference=request.activity_preference,
            user_context=request.check_in,
        )

    monkeypatch.setattr("backend.main.ai_service.generate_reset", generate_local_fallback)
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
        assert 2 <= len(data["instruction"].splitlines()) <= 3
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

def test_generation_prompt_uses_only_stated_context_and_requires_safe_schema():
    check_in = "Low energy after a long afternoon of meetings; I have five minutes."
    user_prompt = build_user_prompt(
        check_in,
        "indoors",
        "sensory_grounding",
        ["A previous activity"],
    )

    assert check_in in user_prompt
    assert "untrusted personal context" in user_prompt
    assert "A previous activity" in user_prompt
    assert "Do not repeat" in user_prompt
    assert "mood, energy, or available time only when the person states them" in user_prompt
    assert "category (one of" in SYSTEM_PROMPT
    assert "duration_minutes (integer exactly 5)" in SYSTEM_PROMPT
    assert "Never diagnose" in SYSTEM_PROMPT
    assert "Never recommend painful" in SYSTEM_PROMPT

def test_curated_fallbacks_do_not_recommend_known_unsafe_actions():
    content = " ".join(
        f"{activity.instruction} {activity.reason}"
        for activity in FALLBACK_ACTIVITIES
    ).lower()

    for unsafe_phrase in (
        "close your eyes",
        "slip off your shoes",
        "plant leaf",
        "pulse points",
        "proprioceptors",
    ):
        assert unsafe_phrase not in content

def test_prompt_uses_contemporary_plain_language():
    assert "Each bullet must describe one simple action" in SYSTEM_PROMPT
    assert "Split compound sentences into separate bullets" in SYSTEM_PROMPT
    assert "exactly two or three short bullet points" in SYSTEM_PROMPT
    assert "Before returning JSON, validate that the instruction contains exactly two or three lines" in SYSTEM_PROMPT
    assert "exactly two or three short bullet lines" in SYSTEM_PROMPT

def test_prompt_asks_generator_not_to_repeat_prior_suggestions():
    prompt = build_user_prompt(
        "Feeling overwhelmed",
        "indoors",
        "any",
        ["Notice one texture"],
    )

    assert "Do not repeat any of these previously suggested activities" in prompt
    assert "Notice one texture" in prompt

def test_fallback_activities_use_concise_contemporary_language():
    assert all(not activity.activity_title.startswith("The ") for activity in FALLBACK_ACTIVITIES)
    for activity in FALLBACK_ACTIVITIES:
        steps = activity.instruction.splitlines()
        assert 2 <= len(steps) <= 3
        assert all(step.startswith("- ") for step in steps)
        assert all(len(step.removeprefix("- ").split()) <= 12 for step in steps)
    assert all(len(activity.reason.split()) <= 45 for activity in FALLBACK_ACTIVITIES)

def test_normalize_instruction_splits_sentences_and_semicolon_safety_notes():
    instruction = (
        "- From a comfortable place, listen for three distinct sounds. "
        "Stay where you are; there is no need to approach a sound."
    )

    assert normalize_instruction(instruction) == (
        "- From a comfortable place, listen for three distinct sounds.\n"
        "- Stay where you are\n"
        "- There is no need to approach a sound."
    )

def test_normalize_instruction_splits_multiple_actions_inside_each_sentence():
    instruction = (
        "Sit comfortably near a window if safe. "
        "Look at a distant object without squinting. "
        "Keep your eyes open."
    )

    assert normalize_instruction(instruction) == (
        "- Sit comfortably near a window if safe.\n"
        "- Look at a distant object without squinting.\n"
        "- Keep your eyes open."
    )

def test_normalize_instruction_splits_participles_without_breaking_introductory_phrases():
    instruction = (
        "From a comfortable place, listen for nearby sounds. "
        "Notice each one, observing its pitch and rhythm."
    )

    assert normalize_instruction(instruction) == (
        "- From a comfortable place, listen for nearby sounds.\n"
        "- Notice each one\n"
        "- Observing its pitch and rhythm."
    )

def test_normalize_instruction_splits_conjoined_actions():
    instruction = (
        "- Hold it in your hand and notice its texture.\n"
        "- Move your fingers slowly."
    )

    assert normalize_instruction(instruction) == (
        "- Hold it in your hand\n"
        "- Notice its texture.\n"
        "- Move your fingers slowly."
    )

def test_normalize_instruction_rejects_one_step_or_overlong_steps():
    assert normalize_instruction("- Notice a sound nearby.") is None
    assert normalize_instruction(
        "- This instruction is intentionally very long and contains way more words than a concise step should ever need today.\n"
        "- Notice a sound."
    ) is None

def test_normalize_instruction_uses_fallback_when_more_than_three_steps_are_needed():
    instruction = (
        "- Sit by a window, look outside, notice a color, and listen for a sound."
    )

    assert normalize_instruction(instruction) is None

def test_grounded_reasons_are_qualified_and_note_activity_evidence_limits():
    assert set(GROUNDED_REASONS) == {
        "Nature",
        "Gentle Movement",
        "Sensory Grounding",
    }
    assert "not well established" in GROUNDED_REASONS["Nature"]
    assert "not established" in GROUNDED_REASONS["Gentle Movement"]
    assert "Evidence for this exact activity is limited" in GROUNDED_REASONS["Sensory Grounding"]

def test_fallback_excludes_previously_suggested_activity_titles():
    previous_title = "Rest your eyes"
    result = get_fallback_reset(
        activity_preference="nature",
        excluded_activity_titles=[previous_title],
    )

    assert result.activity_title != previous_title

@pytest.mark.asyncio
async def test_ai_service_fallback_on_network_failure(monkeypatch):
    async def fail_request(*args, **kwargs):
        raise httpx.ConnectError("simulated provider connection failure")

    monkeypatch.setattr("httpx.AsyncClient.post", fail_request)
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
                            '"category":"Nature","instruction":"- Look toward a distant view.\\n- Notice three things nearby.",'
                            '"reason":"This will definitely reduce stress."}'
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

    result = await service.generate_reset(request)

    assert captured["headers"]["Authorization"] == "Bearer test-api-key"
    assert captured["json"]["messages"][0]["content"] == SYSTEM_PROMPT
    assert request.check_in in captured["json"]["messages"][1]["content"]
    assert captured["json"]["response_format"] == {"type": "json_object"}
    assert result.instruction.splitlines() == [
        "- Look toward a distant view.",
        "- Notice three things nearby.",
    ]
    assert result.reason == GROUNDED_REASONS["Nature"]

@pytest.mark.asyncio
async def test_ai_service_falls_back_when_model_returns_more_than_three_steps(monkeypatch):
    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "choices": [{
                    "message": {
                        "content": json.dumps({
                            "activity_title": "Notice the room",
                            "duration_minutes": 5,
                            "category": "Nature",
                            "instruction": (
                                "- Sit comfortably, look outside, notice a color, "
                                "and listen for a sound."
                            ),
                            "reason": "A test response.",
                            "indoor_alternative": None,
                        })
                    }
                }]
            }

    async def fake_post(*args, **kwargs):
        return FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", fake_post)
    service = AIService(api_key="test-api-key", base_url="https://api.groq.com/openai/v1")
    request = ResetRequest(check_in="Feeling overwhelmed", activity_preference="nature")

    result = await service.generate_reset(request)

    assert 2 <= len(result.instruction.splitlines()) <= 3
    assert all(len(step.removeprefix("- ").split()) <= 12 for step in result.instruction.splitlines())

@pytest.mark.asyncio
async def test_ai_service_replaces_repeated_ai_activity(monkeypatch):
    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "choices": [{
                    "message": {
                        "content": json.dumps({
                            "activity_title": "Rest your eyes",
                            "duration_minutes": 5,
                            "category": "Nature",
                            "instruction": "- Look at a distant view.\n- Notice its colors.",
                            "reason": "Repeated title should be rejected.",
                            "indoor_alternative": None,
                        })
                    }
                }]
            }

    async def fake_post(*args, **kwargs):
        return FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", fake_post)
    service = AIService(api_key="test-key", base_url="https://api.groq.com/openai/v1")
    request = ResetRequest(
        check_in="Feeling overloaded after screen work",
        activity_preference="nature",
        excluded_activity_titles=["Rest your eyes"],
    )

    result = await service.generate_reset(request)

    assert result.activity_title != "Rest your eyes"

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
