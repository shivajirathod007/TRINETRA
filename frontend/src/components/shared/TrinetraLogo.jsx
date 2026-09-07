import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * TrinetraLogo — brand logo with dynamic theme support (dark/light) + wordmark.
 */
export const TrinetraLogo = ({ className = '', size = 32, showText = true }) => {
  const theme = useTheme?.();
  const isDarkMode = theme?.isDarkMode ?? true;
  const logoSrc = isDarkMode ? '/logodark.png' : '/logo.png';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand logo image from public */}
      <div className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}>
        <img
          src={logoSrc}
          alt="TRINETRA Logo"
          className="w-full h-full object-contain"
        />
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
