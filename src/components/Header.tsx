import React from 'react';
import { LoopOutMark } from './LoopOutMark';
import { ThemeMode } from '../types';

interface HeaderProps {
  onResetSession: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onResetSession, theme, onToggleTheme }) => {
  return (
    <header className="border-b border-line bg-canvas/95 sticky top-0 z-30">
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-center">
        <button
          type="button"
          onClick={onResetSession}
          className="flex items-center gap-2.5 text-left rounded-sm"
          aria-label="Return to the LoopOut check-in"
        >
          <LoopOutMark size="sm" />
          <span className="font-editorial text-xl font-medium tracking-tight text-ink-strong">
            LoopOut
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="absolute right-4 sm:right-6 min-h-10 min-w-10 inline-flex items-center justify-center text-muted hover:text-ink-strong hover:bg-tint rounded-full"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? (
            <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};
