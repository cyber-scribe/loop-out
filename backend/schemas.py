from typing import Literal, Optional
from pydantic import BaseModel, Field

EnvironmentPreference = Literal["outdoors", "indoors", "either"]
ActivityPreference = Literal["nature", "gentle_movement", "sensory_grounding", "any"]

class ResetRequest(BaseModel):
    check_in: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="What is happening right now in your screen session"
    )
    environment_preference: EnvironmentPreference = Field(
        default="either",
        description="Preferred setting for the offline reset"
    )
    activity_preference: ActivityPreference = Field(
        default="any",
        description="Preferred type of activity"
    )

class ResetResponse(BaseModel):
    activity_title: str = Field(..., description="Short, calm title for the offline activity")
    duration_minutes: int = Field(default=5, description="Expected duration in minutes (always 5)")
    category: str = Field(..., description="Nature, Gentle Movement, or Sensory Grounding")
    instruction: str = Field(..., description="One clear, specific offline instruction")
    reason: str = Field(..., description="Why this suits the user's stated situation")
    indoor_alternative: Optional[str] = Field(
        default=None,
        description="An accessible indoor alternative if the main activity requires going outside"
    )

class HealthResponse(BaseModel):
    status: str
    provider: str
    model: str
    mock_mode: bool
