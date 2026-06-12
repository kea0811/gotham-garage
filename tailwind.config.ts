import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07070c',
        panel: '#101018',
        ink: '#f4f4f7',
        'ink-muted': '#9b9ba8',
        accent: '#a78bfa',
        'accent-deep': '#7c5cf0',
        danger: '#f87171',
        ok: '#34d399',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
