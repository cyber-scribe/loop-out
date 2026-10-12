from typing import List, Optional
import random
from backend.schemas import ResetResponse, EnvironmentPreference, ActivityPreference

FALLBACK_ACTIVITIES: List[ResetResponse] = [
    ResetResponse(
        activity_title="The Distant Horizon Scan",
        duration_minutes=5,
        category="Nature",
        instruction="Step to the nearest window or outdoors. Find the furthest object on the horizon—a tree line, rooftop, or cloud edge. Soften your gaze and rest your eyes on it for five slow, unhurried breaths without squinting.",
        reason="Shifting from close-range screen focus to distant optical infinity relieves eye muscle tension and broadens your field of awareness.",
        indoor_alternative="Look down the longest hallway or room in your space, resting your eyes on the farthest wall or piece of art."
    ),
    ResetResponse(
        activity_title="Palm & Solid Surface Grounding",
        duration_minutes=5,
        category="Sensory Grounding",
        instruction="Place both palms completely flat against a cool, sturdy surface—a wooden tabletop, windowsill, or tiled floor. Feel the firmness and temperature beneath your skin. Notice your contact points for two minutes without rushing.",
        reason="Physical tactile contact with a stable, cool surface anchors attention back into immediate physical reality.",
        indoor_alternative=None
    ),
    ResetResponse(
        activity_title="Shoulder Roll & Spine Decompression",
        duration_minutes=5,
        category="Gentle Movement",
        instruction="Stand up slowly. Roll both shoulders backwards four times in large, gentle circles, then let them drop completely. Clasp your hands loosely behind your lower back, draw your shoulder blades gently together, and take three full, comfortable breaths.",
        reason="Physical desk work compresses the anterior chest and tightens upper trapezius muscles; this reverses postural slouching.",
        indoor_alternative=None
    ),
    ResetResponse(
        activity_title="Cool Water Sensation & Forearm Rinse",
        duration_minutes=5,
        category="Sensory Grounding",
        instruction="Walk to the nearest sink. Run cool tap water over your wrists and hands for thirty seconds. Pay full attention to the sensation of water running over your skin, then dry your hands slowly with a textured towel.",
        reason="Cool temperature exposure to the pulse points on your wrists provides an immediate, gentle tactile stimulus that interrupts rumination.",
        indoor_alternative=None
    ),
    ResetResponse(
        activity_title="Fresh Air & Ambient Sound Listening",
        duration_minutes=5,
        category="Nature",
        instruction="Step outside onto a porch, balcony, or open a window fully. Close your eyes for just thirty seconds and identify three natural or non-digital sounds (wind, birds, distant rustling). Then open your eyes and take three quiet breaths of fresh air.",
        reason="Natural ambient acoustic variation reduces cognitive fatigue caused by continuous digital notifications and keyboard clatter.",
        indoor_alternative="Open a window a few inches to let fresh air circulate, and listen to the outdoor environment while staying warm."
    ),
    ResetResponse(
        activity_title="Barefoot Floor Contact & Slow Pacing",
        duration_minutes=5,
        category="Gentle Movement",
        instruction="Slip off your shoes. Take ten slow, deliberate steps across your room or floor, feeling each part of your foot—heel, arch, ball, toes—connect with the ground. Turn around and repeat twice at a relaxed pace.",
        reason="Slow, deliberate walking activates proprioceptors in your feet and shifts neurological processing away from mental loops.",
        indoor_alternative=None
    ),
    ResetResponse(
        activity_title="Three Natural Textures Observation",
        duration_minutes=5,
        category="Sensory Grounding",
        instruction="Find three physical items near you with contrasting textures—such as a plant leaf, a coarse fabric, and a smooth stone or ceramic mug. Spend one minute examining each, feeling the ridge, weave, or polish.",
        reason="Intentional tactile exploration engages sensory nerve endings and breaks the tunnel vision of screen staring.",
        indoor_alternative=None
    )
]

def get_fallback_reset(
    environment_preference: EnvironmentPreference = "either",
    activity_preference: ActivityPreference = "any",
    user_context: str = ""
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

    # If user mentions specific physical areas like shoulders, neck, eyes
    ctx_lower = user_context.lower()
    if any(k in ctx_lower for k in ["shoulder", "neck", "back", "tense", "stiff", "sit", "sitting"]):
        movement = [c for c in candidates if c.category == "Gentle Movement"]
        if movement:
            return movement[0]
    elif any(k in ctx_lower for k in ["eye", "headache", "stare", "screen", "blur"]):
        eye_resets = [c for c in candidates if "Horizon" in c.activity_title or c.category == "Nature"]
        if eye_resets:
            return eye_resets[0]

    return random.choice(candidates)
