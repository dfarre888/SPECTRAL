import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Spectral design system — aligned with A3DM store tokens
        bg:      '#080808',
        surf1:   '#0f0f10',
        surf2:   '#161618',
        surf3:   '#1c1c1e',
        border:  'rgba(255,255,255,0.08)',
        divider: 'rgba(255,255,255,0.06)',
        store: {
          bg:      'var(--store-bg)',
          surface: 'var(--store-surface)',
          'surface-2': 'var(--store-surface-2)',
          line:    'var(--store-line)',
          ink:     'var(--store-ink-soft)',
          mute:    'var(--store-ink-mute)',
          accent:  'var(--store-accent)',
        },
        // Text
        't-primary':   'rgba(244,244,245,0.92)',
        't-secondary': 'rgba(244,244,245,0.62)',
        't-muted':     'rgba(244,244,245,0.38)',
        // Force colours
        red:    '#EF4444',  // Red force
        blue:   '#3B82F6',  // Blue force
        // Accents
        orange: '#F97316',  // Warning / highlight
        green:  '#10B981',  // Confirmed / safe
        purple: '#A855F7',  // EW / spectrum
        amber:  '#F59E0B',  // Caution
        cyan:   '#06B6D4',  // GNSS / nav
        safety: '#FF8C00',  // A3DM nav cockpit / CASA orange
        // Spectrum gradient stops (use in D3)
        'spec-rf':      '#A855F7',
        'spec-gnss':    '#06B6D4',
        'spec-c2':      '#F97316',
        'spec-video':   '#EF4444',
        'spec-radar':   '#10B981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'data': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
      },
      backgroundImage: {
        'grid-subtle': 'radial-gradient(circle, #2A2A3A 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-subtle': '24px 24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
export default config
