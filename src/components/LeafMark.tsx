import React from 'react';

interface LeafMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconClass = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const LeafMark: React.FC<LeafMarkProps> = ({ size = 'sm' }) => {
  return (
    <div
      className={`${sizeClass[size]} rounded-full bg-forest text-canvas flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <svg
        className={iconClass[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    </div>
  );
};
