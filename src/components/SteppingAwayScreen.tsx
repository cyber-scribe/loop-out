import React from 'react';
import { LoopOutMark } from './LoopOutMark';

interface SteppingAwayScreenProps {
  activityTitle: string;
  onReturn: () => void;
}

export const SteppingAwayScreen: React.FC<SteppingAwayScreenProps> = ({
  activityTitle,
  onReturn,
}) => {
  return (
    <div className="lo-page text-center">
      <div className="lo-card space-y-7">
        <div className="flex justify-center">
          <LoopOutMark size="lg" />
        </div>

        <div className="space-y-3">
          <h1 className="font-editorial text-2xl sm:text-3xl text-ink-strong font-medium leading-snug">
            Your next step happens away from this screen.
          </h1>
          <p className="text-sm sm:text-base text-muted max-w-md mx-auto leading-relaxed">
            Put the device down and take five unhurried minutes for{' '}
            <span className="font-medium text-ink">“{activityTitle}”</span>.
          </p>
        </div>

        <p className="text-xs text-subtle border-y border-line py-3">
          No countdown. Come back when you are ready.
        </p>

        <button type="button" onClick={onReturn} className="lo-btn-primary">
          I have returned
        </button>
      </div>
    </div>
  );
};
