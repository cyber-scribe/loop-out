import React from 'react';

interface LoopOutMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizeClass = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const LoopOutMark: React.FC<LoopOutMarkProps> = ({ size = 'sm' }) => (
  <span
    className={`${sizeClass[size]} rounded-full bg-accent text-canvas flex items-center justify-center shrink-0`}
    aria-hidden="true"
  >
    <svg className={iconSizeClass[size]} viewBox="0 0 32 32" fill="none">
      <circle
        cx="16"
        cy="16"
        r="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="57 20"
        transform="rotate(-35 16 16)"
      />
      <path
        d="M13.5 12.5v7m5-7v7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  </span>
);
