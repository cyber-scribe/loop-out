import React from 'react';
import { LeafMark } from './LeafMark';

interface HeaderProps {
  onOpenAbout: () => void;
  onResetSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAbout,
  onResetSession,
}) => {
  return (
    <header className="border-b border-line bg-canvas/95 sticky top-0 z-30">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onResetSession}
          className="flex items-center gap-2.5 text-left rounded-sm"
          aria-label="Return to the LoopOut check-in"
        >
          <LeafMark size="sm" />
          <span className="font-editorial text-xl font-medium tracking-tight text-ink-strong">
            LoopOut
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenAbout}
            className="min-h-10 px-3 py-2 text-sm text-muted hover:text-ink-strong rounded-sm"
          >
            About
          </button>
        </div>
      </div>
    </header>
  );
};
