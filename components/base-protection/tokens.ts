import type { LayerState, SystemRole } from '@/lib/base-protection/coverage'

/** Data hues from DESIGN.md for strokes and fills (legible on black and on white). */
export const HUE = {
  blue: '#2997FF',
  red: '#FF5C6E',
  cyan: '#06B6D4',
  amber: '#FBBF24',
  green: '#4ADE80',
} as const

/**
 * Text colours for 11 to 13px values. CSS variables so the daylight theme can
 * swap them for darker values that keep AA contrast on white. Defined by
 * BP_THEME_CSS on `.bp-root`.
 */
export const INK = {
  full: 'var(--bp-full)',
  partial: 'var(--bp-partial)',
  none: 'var(--bp-none)',
  cyan: 'var(--bp-cyan)',
  blue: 'var(--bp-blue)',
  violet: 'var(--bp-violet)',
} as const

export const BP_THEME_CSS = `
.bp-root {
  --bp-full: #6EE7A0; --bp-partial: #FCD34D; --bp-none: #FF8A98;
  --bp-cyan: #5EDCF0; --bp-blue: #6CB8FF; --bp-violet: #C4B5FD;
  --bp-plan-ink: rgba(245, 245, 247, 0.78); --bp-plan-ink-strong: #F5F5F7;
  --bp-plan-grid: rgba(255, 255, 255, 0.06); --bp-plan-bg: rgba(255, 255, 255, 0.02); --bp-plan-halo: #000;
  --bp-footer-bg: #0A0A0C; --bp-btn-bg: rgba(16, 16, 20, 0.92); --bp-btn-bg-hover: rgba(40, 40, 46, 0.95);
}
[data-theme="light"] .bp-root {
  --bp-full: #15803D; --bp-partial: #A16207; --bp-none: #C21F37;
  --bp-cyan: #0E7490; --bp-blue: #0A5FC0; --bp-violet: #6D28D9;
  --bp-plan-ink: rgba(9, 9, 11, 0.7); --bp-plan-ink-strong: #18181B;
  --bp-plan-grid: rgba(9, 9, 11, 0.07); --bp-plan-bg: #FAFAFB; --bp-plan-halo: #fff;
  --bp-footer-bg: #FFFFFF; --bp-btn-bg: rgba(255, 255, 255, 0.96); --bp-btn-bg-hover: #F4F4F6;
}
`

export const STATE_INK: Record<LayerState, string> = {
  full: INK.full,
  partial: INK.partial,
  none: INK.none,
}

export const ROLE_LABEL: Record<SystemRole, string> = {
  sensor: 'Sensor',
  effector: 'Effector',
  integrated: 'Integrated',
}
