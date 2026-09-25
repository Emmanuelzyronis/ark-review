import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'ark-bg': '#0C1A3A',
        'ark-bg-secondary': '#1A2E5A',
        'ark-bg-tertiary': '#243F6E',
        'ark-border': '#2A4A7A',
        'ark-primary': '#3B82F6',
        'ark-primary-hover': '#2563EB',
        'ark-primary-muted': '#1E3A6E',
        'ark-accent': '#EC4899',
        'ark-accent-hover': '#DB2777',
        'ark-accent-muted': '#4A1535',
        'ark-critical': '#EF4444',
        'ark-critical-bg': '#3B0F0F',
        'ark-high': '#F59E0B',
        'ark-high-bg': '#3B2205',
        'ark-low': '#3B82F6',
        'ark-low-bg': '#0F1F3B',
        'ark-info': '#94A3B8',
        'ark-info-bg': '#1E2D45',
        'ark-success': '#10B981',
        'ark-success-bg': '#052E1A',
        'ark-text-primary': '#F1F5F9',
        'ark-text-secondary': '#94A3B8',
        'ark-text-muted': '#64748B',
        'ark-text-inverse': '#0C1A3A',
        'ark-skeleton': '#1A2E5A',
        'ark-skeleton-shine': '#243F6E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'ark-sm': '0 1px 3px rgba(0,0,0,0.4)',
        'ark-md': '0 4px 12px rgba(0,0,0,0.5)',
        'ark-lg': '0 8px 24px rgba(0,0,0,0.6)',
        'ark-glow-primary': '0 0 20px rgba(59,130,246,0.3)',
        'ark-glow-accent': '0 0 20px rgba(236,72,153,0.3)',
        'ark-glow-critical': '0 0 16px rgba(239,68,68,0.3)',
      },
      borderRadius: {
        'ark-sm': '6px',
        'ark-md': '10px',
        'ark-lg': '14px',
        'ark-xl': '20px',
      },
      animation: {
        'shimmer': 'shimmer 1.8s infinite linear',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 250ms ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'waveform': 'waveform 1.2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        waveform: {
          from: { transform: 'scaleY(0.3)' },
          to: { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
