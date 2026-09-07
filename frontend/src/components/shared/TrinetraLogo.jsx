import React from 'react';

/**
 * TrinetraLogo — gradient ring icon + wordmark.
 * Uses CSS variables for text so it works in both light and dark modes
 * without needing the ThemeContext.
 */
export const TrinetraLogo = ({ className = '', size = 32, showText = true }) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Gradient loop ring */}
      <div className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"
          aria-label="TRINETRA logo" role="img">
          <defs>
            <linearGradient id="logoLoopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#f59e0b" />
              <stop offset="30%"  stopColor="#ec4899" />
              <stop offset="65%"  stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          {/* Outer gradient ring */}
          <circle cx="18" cy="18" r="14" stroke="url(#logoLoopGrad)" strokeWidth="3.2" strokeLinecap="round" />
          {/* Inner core — uses currentColor so it responds to the parent's color */}
          <circle cx="18" cy="18" r="4" fill="var(--primary-indigo)" />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-2">
          <span
            className="font-outfit font-extrabold text-xl tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            TRINETRA
          </span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold tracking-wider"
            style={{
              background: 'rgba(99,102,241,0.12)',
              color: 'var(--primary-indigo)',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            PQC
          </span>
        </div>
      )}
    </div>
  );
};

export default TrinetraLogo;
