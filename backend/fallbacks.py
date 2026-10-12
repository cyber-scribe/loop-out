from typing import List, Optional
import random
from backend.schemas import ResetResponse, EnvironmentPreference, ActivityPreference

FALLBACK_ACTIVITIES: List[ResetResponse] = [
    ResetResponse(
        activity_title="Rest your eyes",
        duration_minutes=5,
        category="Nature",
        instruction="- Settle somewhere comfortable near a window or outdoors if safe.\n- Rest your eyes on a distant object.\n- Look away whenever you like.",
        reason="Looking at a distant view changes your visual focus from nearby screen work. Brief distance breaks are a practical eye-rest strategy; this specific activity is not a treatment.",
        indoor_alternative="Look toward the far end of your room or a distant object through a window."
    ),
    ResetResponse(
        activity_title="Notice one texture",
        duration_minutes=5,
        category="Sensory Grounding",
        instruction="- Rest one hand on a familiar nearby surface.\n- Notice its texture.\n- Move your hand whenever you like.",
        reason="Focusing on a familiar texture gives your attention a concrete sensory detail. This is a grounding-style activity, though evidence for this exact exercise is limited.",
        indoor_alternative=None
    ),
    ResetResponse(
        activity_title="Easy shoulder rolls",
        duration_minutes=5,
        category="Gentle Movement",
        instruction="- Let your shoulders relax.\n- Roll them gently in a small circle.\n- Stop if it feels uncomfortable.",
        reason="Gentle shoulder movement offers a low-effort change from staying still. Keep it comfortable; it is not a treatment for pain or tension.",
        indoor_alternative=None
    ),
    ResetResponse(
        activity_title="A cool-water pause",
        duration_minutes=5,
        category="Sensory Grounding",
        instruction="- Rinse your hands with comfortable, cool or room-temperature water.\n- Dry your hands.\n- Skip this if water feels inconvenient or uncomfortable.",
        reason="Noticing water's temperature gives you a concrete sensation to focus on. The specific benefits of a brief hand rinse are not well established.",
        indoor_alternative=None
    ),
    ResetResponse(
        activity_title="Listen for a few sounds",
        duration_minutes=5,
        category="Nature",
        instruction="- Stay comfortably indoors or near a window.\n- Listen for a few nearby sounds.\n- Notice one sound without naming it.",
        reason="Listening directs attention toward sounds in your surroundings. This is a simple present-moment exercise, not a proven treatment for stress.",
        indoor_alternative="Listen from inside near a window; there is no need to open it or go outside."
    ),
    ResetResponse(
        activity_title="Feel your feet on the floor",
        duration_minutes=5,
        category="Gentle Movement",
        instruction="- Sit or stand somewhere comfortable.\n- Notice where your feet meet the floor.\n- Shift your weight gently if comfortable.",
        reason="Noticing your feet gives attention a concrete point of contact with the floor. This grounding-style use is a practical rationale, not proof of a specific outcome.",
        indoor_alternative=None
    ),
    ResetResponse(
        activity_title="Find three different textures",
        duration_minutes=5,
        category="Sensory Grounding",
        instruction="- Choose up to three familiar, safe objects nearby.\n- Notice how each one feels.",
        reason="Comparing familiar textures gives attention concrete sensory details to notice. This is a practical grounding-style activity; evidence for this exact exercise is limited.",
        indoor_alternative=None
    )
]

def get_fallback_reset(
    environment_preference: EnvironmentPreference = "either",
    activity_preference: ActivityPreference = "any",
    user_context: str = "",
    excluded_activity_titles: Optional[List[str]] = None,
) -> ResetResponse:
    candidates = FALLBACK_ACTIVITIES.copy()

    # Filter by category if requested
    cat_map = {
        "nature": "Nature",
        "gentle_movement": "Gentle Movement",
        "sensory_grounding": "Sensory Grounding"
    }
    if activity_preference in cat_map:
        matched_cat = [c for c in candidates if c.category == cat_map[activity_preference]]
        if matched_cat:
            candidates = matched_cat

    # If indoors requested, prefer activities that don't mandate going outside or have indoor alt
    if environment_preference == "indoors":
        indoor_suitable = [c for c in candidates if c.indoor_alternative is not None or c.category in ["Gentle Movement", "Sensory Grounding"]]
        if indoor_suitable:
            candidates = indoor_suitable

    excluded = {title.strip().casefold() for title in excluded_activity_titles or []}
    unseen = [c for c in candidates if c.activity_title.strip().casefold() not in excluded]
    if not unseen and excluded:
        # If a narrow preference has exhausted its curated options, offer any
        # unseen activity that still fits the selected environment.
        unseen = [
            c for c in FALLBACK_ACTIVITIES
            if c.activity_title.strip().casefold() not in excluded
            and (
                environment_preference != "indoors"
                or c.indoor_alternative is not None
                or c.category in ["Gentle Movement", "Sensory Grounding"]
            )
        ]
    if unseen:
        candidates = unseen

    # If user mentions specific physical areas like shoulders, neck, eyes
    ctx_lower = user_context.lower()
    if any(k in ctx_lower for k in ["shoulder", "neck", "back", "tense", "stiff", "sit", "sitting"]):
        movement = [c for c in candidates if c.category == "Gentle Movement"]
        if movement:
            candidates = movement
    elif any(k in ctx_lower for k in ["eye", "headache", "stare", "screen", "blur"]):
        eye_resets = [c for c in candidates if "Rest your eyes" in c.activity_title or c.category == "Nature"]
        if eye_resets:
            candidates = eye_resets

    return random.choice(candidates)
