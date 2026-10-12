import React, { useState } from 'react';
import { EnvironmentPreference, ActivityPreference, ResetRequest } from '../types';

interface CheckInScreenProps {
  onSubmit: (request: ResetRequest) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

const EXAMPLE_PROMPTS = [
  {
    label: 'Debugging, tense',
    text: "I've been debugging for two hours, I'm frustrated, and my shoulders feel tense.",
  },
  {
    label: 'Scattered and tired',
    text: 'Stuck in a spiral of emails and notifications; my eyes burn and I feel scattered.',
  },
  {
    label: 'Mentally blocked',
    text: 'Staring at the same blank document for forty minutes; mentally blocked and restless.',
  },
  {
    label: 'Meeting drain',
    text: 'Back-to-back video meetings all morning, feeling completely drained and stiff.',
  },
];

export const CheckInScreen: React.FC<CheckInScreenProps> = ({
  onSubmit,
  isLoading,
  errorMessage,
}) => {
  const [checkInText, setCheckInText] = useState('');
  const [environment, setEnvironment] = useState<EnvironmentPreference>('either');
  const [activity, setActivity] = useState<ActivityPreference>('any');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = checkInText.trim();
    if (!trimmed) {
      setValidationError('Please share a few words about what is happening right now.');
      return;
    }
    if (trimmed.length < 5) {
      setValidationError('Please write a slightly fuller description so the reset can suit your state.');
      return;
    }
    setValidationError(null);
    onSubmit({
      check_in: trimmed,
      environment_preference: environment,
      activity_preference: activity,
    });
  };

  return (
    <div className="lo-page">
      <div className="text-center mb-8 sm:mb-10 space-y-3">
        <h1 className="lo-title">Step out of the loop.</h1>
        <p className="lo-lede">
          Describe how you feel. LoopOut will suggest one five-minute offline activity.
        </p>
      </div>

      <div className="lo-card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="checkin-input" className="block text-sm font-medium text-ink">
                How are you feeling?
              </label>
              <span className="text-xs text-subtle tabular-nums">{checkInText.length}/1000</span>
            </div>
            <textarea
              id="checkin-input"
              rows={4}
              maxLength={1000}
              disabled={isLoading}
              value={checkInText}
              onChange={(e) => {
                setCheckInText(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. I've been debugging for two hours, I'm frustrated, and my shoulders feel tense."
              className="w-full p-3.5 bg-canvas border border-line-strong rounded-sm text-ink-strong text-sm placeholder:text-subtle focus:bg-surface focus:border-accent resize-none leading-relaxed"
            />
            {validationError && (
              <p className="text-xs text-error font-medium" role="alert">
                {validationError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs text-subtle block">Need a starting point?</span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setCheckInText(prompt.text);
                    setValidationError(null);
                  }}
                  className="min-h-10 text-xs px-2.5 py-2 bg-tint hover:bg-tint-hover text-muted rounded-sm"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-5">
            <fieldset className="space-y-2">
              <legend className="lo-kicker">Environment</legend>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-tint rounded-sm">
                {(['either', 'outdoors', 'indoors'] as EnvironmentPreference[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={isLoading}
                    aria-pressed={environment === opt}
                    onClick={() => setEnvironment(opt)}
                    className={`min-h-10 py-2 text-xs font-medium capitalize rounded-sm ${
                      environment === opt
                        ? 'bg-surface text-ink-strong'
                        : 'text-muted hover:text-ink-strong'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="lo-kicker">Activity</legend>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-tint rounded-sm">
                {(
                  [
                    { id: 'any', label: 'Any' },
                    { id: 'nature', label: 'Nature' },
                    { id: 'gentle_movement', label: 'Movement' },
                    { id: 'sensory_grounding', label: 'Grounding' },
                  ] as { id: ActivityPreference; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isLoading}
                    aria-pressed={activity === opt.id}
                    onClick={() => setActivity(opt.id)}
                    className={`min-h-10 py-2 text-xs font-medium rounded-sm ${
                      activity === opt.id
                        ? 'bg-surface text-ink-strong'
                        : 'text-muted hover:text-ink-strong'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {errorMessage && (
            <div className="p-3 bg-error-bg border border-error-line rounded-sm text-xs text-error" role="alert">
              {errorMessage}
            </div>
          )}

          <button type="submit" disabled={isLoading} className="lo-btn-primary">
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-canvas"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Finding your reset…</span>
              </>
            ) : (
              <span>Find my reset</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
