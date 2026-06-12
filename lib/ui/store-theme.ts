/**
 * A3DM Store design tokens — zinc canvas + orange accent.
 * CSS mirrors: --store-* in globals.css
 */
export const STORE = {
  bg: '#080808',
  surface: '#0f0f10',
  surface2: '#161618',
  line: 'rgba(255,255,255,0.08)',
  inkSoft: 'rgba(244,244,245,0.62)',
  inkMute: 'rgba(244,244,245,0.38)',
  accent: '#F97316',
  accentGlow: 'rgba(249,115,22,0.12)',
  accentBorder: 'rgba(249,115,22,0.35)',
  success: '#4ade80',
} as const

export const STORE_FONT_DISPLAY = 'var(--font-display), system-ui, sans-serif'
export const STORE_FONT_MONO = 'var(--font-mono), ui-monospace, monospace'

export const storeCanvasGradient =
  'radial-gradient(80rem 50rem at 0% 100%, rgba(249,115,22,0.09), transparent 60%), #080808'
