/**
 * A3DM Store design tokens — zinc canvas + orange accent.
 * CSS mirrors: --store-* in globals.css
 */
export const STORE = {
  bg: 'var(--store-bg)',
  surface: 'var(--store-surface)',
  surface2: 'var(--store-surface-2)',
  line: 'var(--store-line)',
  ink: 'var(--store-ink)',
  inkSoft: 'var(--store-ink-soft)',
  inkMute: 'var(--store-ink-mute)',
  accent: 'var(--store-accent)',
  accentGlow: 'var(--store-accent-glow)',
  accentBorder: 'var(--store-accent-border)',
  success: 'var(--store-success)',
  material: 'var(--store-material)',
  materialFloat: 'var(--store-material-float)',
  shadow: 'var(--store-shadow)',
  statusOk: 'var(--store-status-ok)',
  statusWarn: 'var(--store-status-warn)',
} as const

/** Map Intel chrome classes — light theme proving ground for program rollout. */
export const MAP_THEME = {
  scope: 'map-intel',
  material: 'map-material',
  float: 'map-material-float',
  press: 'map-press',
  keepWhite: 'theme-keep-white',
} as const

export const STORE_FONT_DISPLAY = 'var(--font-display), system-ui, sans-serif'
export const STORE_FONT_MONO = 'var(--font-mono), ui-monospace, monospace'

export const storeCanvasGradient =
  'radial-gradient(80rem 50rem at 0% 100%, rgba(249,115,22,0.09), transparent 60%), var(--store-bg)'
