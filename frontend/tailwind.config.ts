/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#8B0000',
          gold: '#B8860B',
          dark: '#1a0a0a',
        },
        risk: {
          critical: '#E24B4A',
          high: '#EF9F27',
          medium: '#FAC775',
          low: '#97C459',
          safe: '#1D9E75',
        },
        pqc: {
          vulnerable: '#E24B4A',
          ready: '#EF9F27',
          safe: '#1D9E75',
        },
        surface: {
          900: '#0f0f0f',
          800: '#161616',
          700: '#1e1e1e',
          600: '#262626',
          500: '#2e2e2e',
          400: '#3a3a3a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
