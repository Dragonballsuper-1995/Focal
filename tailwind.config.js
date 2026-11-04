/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]', '[data-theme="oled"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        focal: {
          50: '#FFF5F1',  // Solar Mist
          100: '#FFE6DD', // Peach Blossom
          200: '#FFCDBD', // Soft Apricot
          300: '#FFA58C', // Warm Dawn
          400: '#FFA06A', // Logo Top Bar (Amber Peach)
          500: '#FF6B4A', // Brand Primary Anchor (Focal Coral)
          550: '#FF5370', // Coral Rose Transition
          600: '#FF4565', // Logo Mid Bar (Rose Magenta)
          700: '#E11D48', // Logo Base Dot (Ruby Rose)
          800: '#BE123C', // Deep Velvet
          900: '#881337', // Obsidian Crimson
          950: '#4C0519', // Nocturne Wine
        },
        obsidian: {
          950: '#090B0F', // Canvas root
          900: '#0E1118', // Surface base (HUD Shell)
          850: '#131722', // Surface raised (Cards, Panels)
          800: '#1F2637', // Surface overlay (Action Menu, Modals)
          750: '#252B3C', // High hover
        },
        solar: {
          50: '#F8FAFC',
          100: '#FFFFFF',
          200: '#F1F5F9',
          300: '#E2E8F0',
          400: '#CBD5E1',
          hover: '#FFF5F2',
        },
        pearl: {
          50: '#F8FAFC',
          100: '#FFFFFF',
          200: '#F1F5F9',
          300: '#E2E8F0',
          400: '#CBD5E1',
          hover: '#FFF5F2',
        },
        accent: 'var(--sys-accent, #FF6B4A)',
        hud: {
          base: 'var(--canvas-bg, #090B0F)',
          sub: 'var(--surface-base, #0E1118)',
          panel: 'var(--surface-raised, #131722)',
          card: 'var(--surface-overlay, #1F2637)',
          border: 'var(--border-hairline, #222738)',
          grid: 'var(--border-subtle, #2D344B)',
          hairline: 'var(--border-hairline, #222738)',
        },
        raycast: {
          brand: 'var(--sys-accent, #FF6B4A)',
          'brand-hover': '#FF5370',
          'brand-muted': 'rgba(255, 107, 74, 0.18)',
          dark: {
            base: '#090B0F',
            surface: '#0E1118',
            hover: '#252B3C',
            active: '#1F2637',
            border: '#222738',
            separator: '#2D344B',
            text: '#F8FAFC',
            'text-muted': '#94A3B8',
            'text-dim': '#64748B',
          },
          light: {
            base: '#F8FAFC',
            surface: '#FFFFFF',
            hover: '#FFF5F2',
            active: '#F1F5F9',
            border: '#E2E8F0',
            separator: '#CBD5E1',
            text: '#0F172A',
            'text-muted': '#475569',
            'text-dim': '#94A3B8',
          },
        },
      },
      backgroundImage: {
        'focal-sunset': 'var(--focal-gradient-sunset, linear-gradient(135deg, #FFA06A 0%, #FF6B4A 35%, #FF5370 70%, #FF4565 100%))',
        'focal-capsule': 'var(--focal-gradient-capsule, linear-gradient(90deg, #FFA07A 0%, #FB923C 30%, #FF5370 65%, #F43F5E 100%))',
        'focal-border': 'var(--focal-gradient-border, linear-gradient(135deg, rgba(255, 107, 74, 0.6) 0%, rgba(255, 83, 112, 0.35) 50%, rgba(255, 69, 101, 0.25) 75%, rgba(255, 255, 255, 0.06) 100%))',
        'focal-glow': 'var(--focal-gradient-glow, linear-gradient(135deg, rgba(255, 107, 74, 0.4) 0%, rgba(255, 83, 112, 0.3) 50%, rgba(255, 69, 101, 0.2) 100%))',
        'focal-row-dark': 'linear-gradient(90deg, rgba(255, 107, 74, 0.20) 0%, rgba(255, 69, 101, 0.08) 100%)',
        'focal-row-light': 'linear-gradient(90deg, rgba(255, 107, 74, 0.12) 0%, rgba(255, 69, 101, 0.04) 100%)',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '16px',
        '2xl': '18px',
        '3xl': '22px',
        'tile': '22px',
        'pill': '9999px',
        'palette': '20px',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Geist Mono"',
          'Consolas',
          'monospace',
        ],
        hud: [
          '"Plus Jakarta Sans"',
          '"Space Grotesk"',
          'sans-serif',
        ],
      },
      boxShadow: {
        'focal-glow': '0 16px 48px -10px rgba(255, 107, 74, 0.35)',
        'focal-window': '0 24px 64px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px #222738',
        'focal-card': '0 12px 32px -8px rgba(0, 0, 0, 0.4)',
        'focal-ring': '0 0 0 1.5px rgba(255, 107, 74, 0.5), 0 0 16px rgba(255, 107, 74, 0.25)',
        palette: '0 24px 64px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px #222738',
        'palette-light': '0 20px 50px -10px rgba(0, 0, 0, 0.12), 0 0 0 1px #E2E8F0',
      },
      animation: {
        'logo-aura': 'pulseAura 4s ease-in-out infinite',
        'focal-dot': 'focalDotBreath 2.4s ease-in-out infinite',
      },
      keyframes: {
        pulseAura: {
          '0%, 100%': { filter: 'drop-shadow(0 0 14px rgba(255, 107, 74, 0.35))' },
          '50%': { filter: 'drop-shadow(0 0 28px rgba(255, 69, 101, 0.65))' },
        },
        focalDotBreath: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.95' },
          '50%': { transform: 'scale(1.18)', opacity: '1', filter: 'drop-shadow(0 0 8px #FF6B4A)' },
        },
      },
    },
  },
  plugins: [],
};
