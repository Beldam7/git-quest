/** @type {import('tailwindcss').Config} */
// Design tokens for Git Quest. See docs/DESIGN.md.
// The default blue/green/gray scales are retuned so existing utility classes
// (bg-blue-600, text-gray-400, ...) pick up the kingdom palette automatically.
export default {
  content: ['./web/index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kq: {
          ink: '#04070f',
          night: '#060b17',
          deep: '#0a1327',
          panel: '#101c36',
          raised: '#16264a',
          edge: '#243455',
          text: '#e8eefc',
          muted: '#9fb0cf',
          cyan: '#3dd6f5',
          emerald: '#34d399',
          gold: '#f5b942',
          ruby: '#f0596b',
          violet: '#9b7cf6',
        },
        gray: {
          50: '#f4f7ff', 100: '#e8eefc', 200: '#d3ddf2', 300: '#b9c6e2', 400: '#9fb0cf',
          500: '#8093b6', 600: '#5b6d92', 700: '#33425f', 800: '#1c2945', 900: '#0f1830', 950: '#080f20',
        },
        blue: {
          300: '#8fe6f8', 400: '#5adcf6', 500: '#25bfe2', 600: '#0d94b8', 700: '#0a7391', 800: '#0a5870', 900: '#0a3f50',
        },
        green: {
          300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        sans: ['"Alegreya Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px rgba(61,214,245,0.35)',
        'glow-gold': '0 0 24px rgba(245,185,66,0.35)',
      },
    },
  },
  plugins: [],
};
