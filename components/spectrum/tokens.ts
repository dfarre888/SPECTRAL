/**
 * Spectrum Intelligence — design tokens
 * Liquid Glass language. Import the CSS once at the app root; use the TS
 * constants in components where inline values are needed (SVG fills, etc.).
 */

export const TOKENS = {
  bg: '#000000',
  bg2: '#1D1D1F',
  ink: '#F5F5F7',
  inkDim: '#A1A1A6',
  inkFaint: '#86868B',
  // Chrome accent is blue app-wide; orange survives only as a data colour (IR, jam).
  orange: '#2997FF',
  orangeSoft: '#5BB0FF',
  blue: '#2997FF',
  green: '#4ade80',
  amber: '#fbbf24',
  red: '#f87171',
  cyan: '#22d3ee',
  purple: '#a78bfa',
  magenta: '#e879f9',
  slate: '#94a3b8',
  glass: '#000000',
  glassHi: '#1D1D1F',
  glassLine: 'rgba(255,255,255,0.10)',
  glassLineHi: 'rgba(255,255,255,0.34)',
  mono: "'JetBrains Mono', monospace",
  display: "'Space Grotesk', sans-serif",
  ui: "var(--font-geist-sans), system-ui, sans-serif",
} as const;

export const SPECTRUM_CSS = `
:root{
  --sx-bg:#000000; --sx-bg2:#1D1D1F;
  --sx-ink:#F5F5F7; --sx-ink-dim:#A1A1A6; --sx-ink-faint:#86868B;
  --sx-orange:#2997FF; --sx-orange-soft:#5BB0FF;
  --sx-blue:#2997FF; --sx-green:#4ade80; --sx-amber:#fbbf24;
  --sx-red:#f87171; --sx-cyan:#22d3ee; --sx-purple:#a78bfa; --sx-magenta:#e879f9; --sx-slate:#94a3b8;
  --sx-glass:#000000; --sx-glass-hi:#1D1D1F;
  --sx-glass-line:rgba(255,255,255,0.10); --sx-glass-line-hi:rgba(255,255,255,0.34);
  --sx-mono:'JetBrains Mono',monospace; --sx-display:'Space Grotesk',sans-serif; --sx-ui:var(--font-geist-sans),system-ui,sans-serif;
}
.sx-root{background:var(--sx-bg);color:var(--sx-ink);font-family:var(--sx-ui);-webkit-font-smoothing:antialiased;position:relative}
/* Content layer stays matte: hairline panels on the black ground, no glass (HIG). */
.sx-glass{background:var(--sx-glass);border:1px solid var(--sx-glass-line);border-radius:14px;}
.sx-glass-hi{background:var(--sx-glass-hi);border-color:var(--sx-glass-line-hi);}
.sx-mono{font-family:var(--sx-mono);font-variant-numeric:tabular-nums;}
.sx-display{font-family:var(--sx-display);}
.sx-dim{color:var(--sx-ink-dim);} .sx-faint{color:var(--sx-ink-faint);}
.sx-dot{display:inline-block;border-radius:50%;box-shadow:0 0 10px currentColor;}
`;

/** Layer → token colour, mirrors lib/spectrum/scale.ts LAYER_COLOR. */
export const LAYER_TOKEN = {
  comms: TOKENS.cyan,
  navigation: TOKENS.green,
  radar: TOKENS.amber,
  eo_ir: TOKENS.magenta,
  cbrn: TOKENS.slate,
} as const;
