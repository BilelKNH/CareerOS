import type { Config } from 'tailwindcss';

const withOpacity = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: withOpacity('--bg'),
        surface: withOpacity('--surface'),
        border: withOpacity('--border'),
        foreground: withOpacity('--fg'),
        muted: withOpacity('--muted'),
        brand: {
          DEFAULT: withOpacity('--brand'),
          fg: withOpacity('--brand-fg'),
        },
        // Theme-aware overrides so existing slate utilities flip in dark mode
        // without touching every component.
        slate: {
          50: withOpacity('--panel'),
          100: withOpacity('--panel'),
          200: withOpacity('--border'),
          600: withOpacity('--muted'),
          700: withOpacity('--fg'),
          800: withOpacity('--fg'),
          900: withOpacity('--fg'),
        },
      },
      borderRadius: {
        lg: '0.5rem', // Nocturne radius-md 8px
        xl: '0.625rem',
        '2xl': '0.875rem', // Nocturne radius-lg 14px
      },
      boxShadow: {
        sm: '0 0 0 1px rgb(0 0 0 / 0.06)',
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};

export default config;
