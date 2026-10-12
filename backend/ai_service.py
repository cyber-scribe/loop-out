import json
import logging
from typing import Optional
import httpx

from backend.config import AI_API_KEY, AI_API_BASE_URL, AI_MODEL, AI_PROVIDER
from backend.schemas import ResetRequest, ResetResponse
from backend.prompts import SYSTEM_PROMPT, build_user_prompt
from backend.fallbacks import get_fallback_reset

logger = logging.getLogger("loopout.ai_service")

class AIService:
    def __init__(
        self,
        api_key: str = AI_API_KEY,
        base_url: str = AI_API_BASE_URL,
        model: str = AI_MODEL,
        provider: str = AI_PROVIDER
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.provider = provider

    @property
    def is_mock_mode(self) -> bool:
        return not bool(self.api_key)

    async def generate_reset(self, request: ResetRequest) -> ResetResponse:
        """
        Generates a personalized 5-minute offline reset using the configured open-weight model.
        Falls back cleanly to curated safe activities if unconfigured, rate-limited, or errored.
        """
        if self.is_mock_mode:
            logger.info("AI_API_KEY not configured. Using safe local fallback reset generator.")
            return get_fallback_reset(
                environment_preference=request.environment_preference,
                activity_preference=request.activity_preference,
                user_context=request.check_in
            )

        endpoint = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(
                    request.check_in,
                    request.environment_preference,
                    request.activity_preference
                )}
            ],
            "temperature": 0.5,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                response = await client.post(endpoint, headers=headers, json=payload)
                
                if response.status_code != 200:
                    logger.warning(
                        f"AI upstream provider ({self.provider}) returned status {response.status_code}: {response.text[:200]}"
                    )
                    return get_fallback_reset(
                        environment_preference=request.environment_preference,
                        activity_preference=request.activity_preference,
                        user_context=request.check_in
                    )
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Parse JSON content
                parsed_json = json.loads(content)

                # Ensure duration_minutes is 5
                parsed_json["duration_minutes"] = 5

                # Standardize category
                cat = parsed_json.get("category", "")
                if "nature" in cat.lower():
                    parsed_json["category"] = "Nature"
                elif "movement" in cat.lower() or "gentle" in cat.lower():
                    parsed_json["category"] = "Gentle Movement"
                elif "sensory" in cat.lower() or "ground" in cat.lower():
                    parsed_json["category"] = "Sensory Grounding"
                else:
                    parsed_json["category"] = "Nature"

                # Validate with Pydantic
                validated_reset = ResetResponse(**parsed_json)
                return validated_reset

        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.error(f"Network error communicating with AI endpoint {endpoint}: {exc}")
            return get_fallback_reset(
                environment_preference=request.environment_preference,
                activity_preference=request.activity_preference,
                user_context=request.check_in
            )
        except (json.JSONDecodeError, KeyError, ValueError) as exc:
            logger.error(f"Failed to parse or validate AI output: {exc}")
            return get_fallback_reset(
                environment_preference=request.environment_preference,
                activity_preference=request.activity_preference,
                user_context=request.check_in
            )

ai_service = AIService()
