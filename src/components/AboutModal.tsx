import React, { useEffect } from 'react';
import { LeafMark } from './LeafMark';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-strong/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="bg-surface border border-line rounded-lg max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <LeafMark size="sm" />
            <h2 id="about-title" className="font-editorial text-xl font-medium text-ink-strong">
              About LoopOut
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-subtle hover:text-ink-strong text-sm px-2 py-1 rounded-sm"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="text-sm text-muted leading-relaxed space-y-4">
          <p>
            LoopOut helps you step away from the screen with one personalized,
            five-minute offline activity when you feel overwhelmed.
          </p>
          <p>
            Describe how you feel, optionally choose an environment or activity
            type, then put the device down. There are no streaks, scores,
            accounts, or timers.
          </p>
          <p>
            Your check-in is sent only to generate a single suggestion. Nothing
            is stored as a profile, and there is no login.
          </p>
        </div>

        <div className="pt-2">
          <button type="button" onClick={onClose} className="lo-btn-primary">
            Back to LoopOut
          </button>
        </div>
      </div>
    </div>
  );
};
