/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Brand ── */
        brand: {
          indigo: '#6366f1',
          'indigo-hover': '#818cf8',
          amber: '#f59e0b',
          cyan: '#06b6d4',
          violet: '#8b5cf6',
          /* Legacy aliases kept for backward compat */
          red:  '#6366f1',   // was #8B0000 — now mapped to indigo
          gold: '#f59e0b',
          dark: '#060813',
        },
        /* ── Risk / Status (matches CSS vars) ── */
        risk: {
          critical: '#ef4444',
          high:     '#f97316',
          medium:   '#eab308',
          low:      '#3b82f6',
          safe:     '#22c55e',
          pqc:      '#a78bfa',
        },
        /* ── PQC Status ── */
        pqc: {
          vulnerable: '#ef4444',
          ready:      '#f97316',
          safe:       '#22c55e',
        },
        /* ── Surface (dark mode backgrounds) ── */
        surface: {
          950: '#060813',
          900: '#0a0f1e',
          800: '#0d121f',
          700: '#141e33',
          600: '#1a2540',
          500: '#1e2d4a',
          400: '#263559',
        },
        /* ── Status (light-mode adjusted) ── */
        status: {
          critical: 'var(--status-critical)',
          high:     'var(--status-high)',
          medium:   'var(--status-medium)',
          safe:     'var(--status-safe)',
          pqc:      'var(--status-pqc)',
        },
      },
      fontFamily: {
        sans:   ['Inter', 'system-ui', 'sans-serif'],
        mono:   ['JetBrains Mono', 'monospace'],
        outfit: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        'xs':  '6px',
        'sm':  '8px',
        'md':  '12px',
        'lg':  '16px',
        'xl':  '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'card':        '0 4px 24px rgba(0,0,0,0.40), 0 1px 4px rgba(0,0,0,0.20)',
        'card-hover':  '0 8px 32px rgba(0,0,0,0.50), 0 0 0 1px rgba(99,102,241,0.15)',
        'card-light':  '0 2px 12px rgba(99,102,241,0.08), 0 1px 3px rgba(0,0,0,0.05)',
        'glow-indigo': '0 0 20px rgba(99,102,241,0.25)',
        'glow-amber':  '0 0 12px rgba(245,158,11,0.30)',
        'glow-red':    '0 0 12px rgba(239,68,68,0.30)',
        'glow-green':  '0 0 12px rgba(34,197,94,0.30)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease forwards',
        'slide-in-left': 'slideInLeft 0.25s ease forwards',
        'scale-in':      'scaleIn 0.22s ease forwards',
        'spin-slow':     'spin-slow 3s linear infinite',
        'scan':          'scan-pulse 1.5s ease-in-out infinite',
        'pulse-subtle':  'pulse-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft:  { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:      { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'spin-slow':  { to: { transform: 'rotate(360deg)' } },
        'scan-pulse': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.40' } },
        'pulse-subtle': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.60' } },
      },
    },
  },
  plugins: [],
}
