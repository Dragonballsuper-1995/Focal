/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        hud: {
          base: '#0E1015',
          sub: '#14161C',
          panel: '#111318',
          card: '#161820',
          border: '#262A36',
          grid: '#1D202A',
          hairline: '#161822',
        },
        accent: 'var(--sys-accent, #0078D4)',
        raycast: {
          brand: 'var(--sys-accent, #0078D4)',
          'brand-hover': '#1A90F0',
          'brand-muted': 'rgba(0, 120, 212, 0.18)',
          dark: {
            base: '#0E1015',
            surface: 'rgba(255, 255, 255, 0.04)',
            hover: 'rgba(255, 255, 255, 0.08)',
            active: 'rgba(255, 255, 255, 0.12)',
            border: '#262A36',
            separator: '#1D202A',
            text: '#EAEAEF',
            'text-muted': '#868A98',
            'text-dim': '#505462',
          },
          light: {
            base: '#ffffff',
            surface: 'rgba(0, 0, 0, 0.03)',
            hover: 'rgba(0, 0, 0, 0.06)',
            active: 'rgba(0, 0, 0, 0.10)',
            border: 'rgba(0, 0, 0, 0.08)',
            separator: 'rgba(0, 0, 0, 0.05)',
            text: '#18181b',
            'text-muted': '#71717a',
            'text-dim': '#a1a1aa',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"Geist Mono"',
          'Consolas',
          'monospace',
        ],
        hud: [
          '"Space Grotesk"',
          'sans-serif',
        ],
      },
      boxShadow: {
        palette: '0 24px 60px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'palette-light': '0 20px 50px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        palette: '14px',
      },
    },
  },
  plugins: [],
};
