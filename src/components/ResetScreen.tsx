import React from 'react';
import { ResetResponse } from '../types';

interface ResetScreenProps {
  reset: ResetResponse;
  onStepAway: () => void;
  onChooseAnother: () => void;
  isLoadingAnother: boolean;
}

export const ResetScreen: React.FC<ResetScreenProps> = ({
  reset,
  onStepAway,
  onChooseAnother,
  isLoadingAnother,
}) => {
  const duration = reset.duration_minutes || 5;
  const instructionSteps = reset.instruction
    .split(/\r?\n/)
    .map((step) => step.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);

  return (
    <div className="lo-page">
      <div className="text-center mb-8 space-y-2">
        <span className="lo-kicker">Suggested activity</span>
        <h1 className="lo-title">{reset.activity_title}</h1>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-subtle pt-1">
          <span>{reset.category}</span>
          <span aria-hidden="true">·</span>
          <span>{duration} minutes</span>
          {reset.indoor_alternative && (
            <>
              <span aria-hidden="true">·</span>
              <span>Indoor option included</span>
            </>
          )}
        </div>
      </div>

      <div className="lo-card space-y-6">
        <section
          className="lo-instruction rounded-md border p-5 sm:p-6"
          aria-labelledby="activity-steps-title"
        >
          <h2 id="activity-steps-title" className="lo-kicker mb-4">
            Your steps
          </h2>
          <ul className="lo-instruction-list list-disc pl-5 space-y-3 text-base sm:text-lg font-medium leading-relaxed">
            {instructionSteps.map((step, index) => (
              <li key={`${index}-${step}`}>{step}</li>
            ))}
          </ul>
        </section>

        <div className="pt-5 border-t border-line space-y-2">
          <h3 className="lo-kicker">Why this fits</h3>
          <p className="text-sm text-muted leading-relaxed">{reset.reason}</p>
        </div>

        {reset.indoor_alternative && (
          <div className="pt-5 border-t border-line space-y-2">
            <h3 className="lo-kicker">If you stay indoors</h3>
            <p className="text-sm text-muted leading-relaxed">{reset.indoor_alternative}</p>
          </div>
        )}

        <div className="pt-5 border-t border-line space-y-2">
          <button type="button" onClick={onStepAway} className="lo-btn-primary">
            I’m stepping away
          </button>
          <button
            type="button"
            disabled={isLoadingAnother}
            onClick={onChooseAnother}
            className="lo-btn-secondary"
          >
            {isLoadingAnother ? 'Selecting another…' : 'Choose another'}
          </button>
        </div>
      </div>
    </div>
  );
};
