import React, { useState } from 'react';
import { ReturnChoice } from '../types';

interface ReturnScreenProps {
  onStartFresh: () => void;
  onRequestAnotherReset: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const ReturnScreen: React.FC<ReturnScreenProps> = ({
  onStartFresh,
  onRequestAnotherReset,
  isLoading = false,
  errorMessage = null,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<ReturnChoice | null>(null);

  const getNeutralConfirmation = (choice: ReturnChoice) => {
    switch (choice) {
      case 'ready_to_continue':
        return {
          title: 'Ready to continue',
          message: 'You interrupted the loop. Return to your work at your own pace.',
          actionLabel: 'Back to check-in',
          action: onStartFresh,
        };
      case 'need_another_break':
        return {
          title: 'Another break',
          message: 'One reset is not always enough. Another offline activity is ready when you are.',
          actionLabel: 'Find another reset',
          action: onRequestAnotherReset,
        };
      case 'done_for_now':
        return {
          title: 'Done for now',
          message: 'Recognizing when to stop is enough. Put the screen away.',
          actionLabel: 'Start over',
          action: onStartFresh,
        };
    }
  };

  const confirmation = selectedChoice ? getNeutralConfirmation(selectedChoice) : null;

  return (
    <div className="lo-page">
      <div className="text-center mb-8 space-y-2">
        <h1 className="lo-title">Welcome back.</h1>
        <p className="text-sm sm:text-base text-muted">How do you feel after time offline?</p>
      </div>

      <div className="lo-card space-y-6">
        {!selectedChoice ? (
          <div className="space-y-3">
            <span className="lo-kicker block">Choose what fits</span>
            <div className="space-y-2.5">
              <button type="button" onClick={() => setSelectedChoice('ready_to_continue')} className="lo-choice">
                <span className="text-sm font-medium text-ink-strong">Ready to continue</span>
                <p className="text-xs text-subtle mt-1">I feel clearer and can resume.</p>
              </button>

              <button type="button" onClick={() => setSelectedChoice('need_another_break')} className="lo-choice">
                <span className="text-sm font-medium text-ink-strong">I need another break</span>
                <p className="text-xs text-subtle mt-1">I need another few minutes offline.</p>
              </button>

              <button type="button" onClick={() => setSelectedChoice('done_for_now')} className="lo-choice">
                <span className="text-sm font-medium text-ink-strong">I’m done for now</span>
                <p className="text-xs text-subtle mt-1">I’ll step away from the computer for longer.</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-editorial text-2xl text-ink-strong font-medium">{confirmation?.title}</h2>
              <p className="text-sm text-muted leading-relaxed">{confirmation?.message}</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-error-bg border border-error-line rounded-sm text-xs text-error" role="alert">
                {errorMessage}
              </div>
            )}

            <div className="pt-4 border-t border-line flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={confirmation?.action}
                disabled={isLoading}
                className="lo-btn-primary flex-1"
              >
                {isLoading ? 'Finding another…' : confirmation?.actionLabel}
              </button>
              <button
                type="button"
                onClick={() => setSelectedChoice(null)}
                disabled={isLoading}
                className="lo-btn-secondary sm:w-auto px-4"
              >
                Change
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
