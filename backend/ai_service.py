import json
import logging
import re
from typing import Optional
import httpx

from backend.config import AI_API_KEY, AI_API_BASE_URL, AI_MODEL, AI_PROVIDER
from backend.schemas import ResetRequest, ResetResponse
from backend.prompts import SYSTEM_PROMPT, build_user_prompt
from backend.fallbacks import get_fallback_reset

logger = logging.getLogger("loopout.ai_service")

ACTION_VERBS = (
    "adjust|allow|anchor|appreciate|bend|blink|breathe|bring|choose|close|compare|"
    "count|describe|discover|do|draw|drop|dry|ease|examine|explore|extend|feel|"
    "find|focus|follow|give|glance|grip|hear|hold|identify|imagine|keep|lean|"
    "let|lift|listen|look|lower|make|name|notice|observe|open|pause|pay|pick|place|point|"
    "press|reach|release|remain|repeat|rest|return|rinse|roll|rotate|rub|scan|"
    "see|select|sense|set|shift|sit|skip|smell|soften|sound|stand|start|stay|"
    "step|stop|stretch|take|tap|think|touch|track|try|turn|use|watch"
)
ACTION_PREFIX = rf"(?:{ACTION_VERBS})(?:s|es|ed|ing)?"
ACTION_JOINER = re.compile(
    rf"\s+(?:and then|then|and)\s+(?!(?:look\s+away\s+whenever\s+you\s+like)\b)(?={ACTION_PREFIX}\b)",
    re.IGNORECASE,
)
GERUND_ACTION = re.compile(
    r",\s+(?=(?:adjusting|allowing|anchoring|bending|blinking|choosing|closing|"
    r"comparing|counting|describing|discovering|drawing|dropping|drying|easing|"
    r"examining|exploring|extending|feeling|finding|focusing|following|giving|"
    r"glancing|gripping|hearing|holding|identifying|imagining|leaning|lifting|"
    r"looking|lowering|making|moving|naming|noticing|observing|opening|pausing|"
    r"picking|placing|pointing|pressing|reaching|releasing|repeating|resting|"
    r"returning|rinsing|rolling|rotating|rubbing|scanning|seeing|selecting|"
    r"sensing|shifting|sitting|skipping|smelling|softening|standing|staying|"
    r"stepping|stretching|taking|tapping|thinking|touching|tracking|trying|"
    r"turning|using|watching)\b)",
    re.IGNORECASE,
)
COMMA_ACTION = re.compile(
    rf",\s+(?={ACTION_PREFIX}\b)",
    re.IGNORECASE,
)
GROUNDED_REASONS = {
    "Nature": (
        "Noticing nearby sights or sounds gives attention concrete details away from the screen. "
        "Benefits of this specific brief activity are not well established."
    ),
    "Gentle Movement": (
        "A small, comfortable movement offers a brief change from staying still. "
        "The specific effects of this activity are not established."
    ),
    "Sensory Grounding": (
        "Focusing on a physical sensation is a grounding-style way to direct attention to the present. "
        "Evidence for this exact activity is limited."
    ),
}


def normalize_instruction(instruction: str) -> Optional[str]:
    def begins_with_action(text: str) -> bool:
        return re.match(rf"^\s*{ACTION_PREFIX}\b", text, re.IGNORECASE) is not None

    steps = []
    for line in instruction.splitlines():
        line = re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", line).strip()
        if not line:
            continue
        sentences = re.split(
            r"(?<=[.!?])\s+|;\s+|,\s+(?=(?:then|after that|before that)\b)",
            line,
            flags=re.IGNORECASE,
        )
        for sentence in sentences:
            clauses = ACTION_JOINER.split(sentence.strip())
            for clause in clauses:
                if begins_with_action(clause):
                    actions = GERUND_ACTION.split(clause)
                    comma_actions = []
                    for action in actions:
                        if begins_with_action(action):
                            comma_actions.extend(COMMA_ACTION.split(action))
                        else:
                            comma_actions.append(action)
                else:
                    comma_actions = [clause]
                for action in comma_actions:
                    action = action.strip()
                    if action:
                        steps.append(action[0].upper() + action[1:])

    if not 2 <= len(steps) <= 3 or any(len(step.split()) > 12 for step in steps):
        return None

    return "\n".join(f"- {step}" for step in steps)


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
                user_context=request.check_in,
                excluded_activity_titles=request.excluded_activity_titles,
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
                    request.activity_preference,
                    request.excluded_activity_titles,
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
                        user_context=request.check_in,
                        excluded_activity_titles=request.excluded_activity_titles,
                    )
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Parse JSON content
                parsed_json = json.loads(content)

                # Ensure duration_minutes is 5
                parsed_json["duration_minutes"] = 5

                instruction = parsed_json.get("instruction")
                if not isinstance(instruction, str):
                    raise ValueError("AI instruction must be a string")
                normalized_instruction = normalize_instruction(instruction)
                if normalized_instruction is None:
                    logger.warning("AI instruction could not be split into 2-3 concise action steps; using fallback.")
                    return get_fallback_reset(
                        environment_preference=request.environment_preference,
                        activity_preference=request.activity_preference,
                        user_context=request.check_in,
                        excluded_activity_titles=request.excluded_activity_titles,
                    )
                parsed_json["instruction"] = normalized_instruction

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

                parsed_json["reason"] = GROUNDED_REASONS[parsed_json["category"]]

                # Validate with Pydantic
                validated_reset = ResetResponse(**parsed_json)
                excluded_titles = {
                    title.strip().casefold()
                    for title in request.excluded_activity_titles
                }
                if validated_reset.activity_title.strip().casefold() in excluded_titles:
                    logger.info("AI repeated a previously suggested activity; using an unseen fallback.")
                    return get_fallback_reset(
                        environment_preference=request.environment_preference,
                        activity_preference=request.activity_preference,
                        user_context=request.check_in,
                        excluded_activity_titles=request.excluded_activity_titles,
                    )
                return validated_reset

        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.error(f"Network error communicating with AI endpoint {endpoint}: {exc}")
            return get_fallback_reset(
                environment_preference=request.environment_preference,
                activity_preference=request.activity_preference,
                user_context=request.check_in,
                excluded_activity_titles=request.excluded_activity_titles,
            )
        except (json.JSONDecodeError, KeyError, ValueError) as exc:
            logger.error(f"Failed to parse or validate AI output: {exc}")
            return get_fallback_reset(
                environment_preference=request.environment_preference,
                activity_preference=request.activity_preference,
                user_context=request.check_in,
                excluded_activity_titles=request.excluded_activity_titles,
            )

ai_service = AIService()
