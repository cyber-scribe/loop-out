export type EnvironmentPreference = 'outdoors' | 'indoors' | 'either';

export type ActivityPreference = 'nature' | 'gentle_movement' | 'sensory_grounding' | 'any';

export interface ResetRequest {
  check_in: string;
  environment_preference: EnvironmentPreference;
  activity_preference: ActivityPreference;
}

export interface ResetResponse {
  activity_title: string;
  duration_minutes: number;
  category: string;
  instruction: string;
  reason: string;
  indoor_alternative?: string | null;
}

export interface HealthResponse {
  status: string;
  provider: string;
  model: string;
  mock_mode: boolean;
}

export type ScreenState = 'checkin' | 'reset' | 'stepping_away' | 'return';

export type ReturnChoice = 'ready_to_continue' | 'need_another_break' | 'done_for_now';
