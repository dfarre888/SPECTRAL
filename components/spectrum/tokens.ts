/**
 * Spectrum Intelligence — design tokens
 * Liquid Glass language. Import the CSS once at the app root; use the TS
 * constants in components where inline values are needed (SVG fills, etc.).
 */

export const TOKENS = {
  bg: '#060708',
  bg2: '#0a0c0e',
  ink: '#f4f6f8',
  inkDim: '#8b939c',
  inkFaint: '#525a63',
  orange: '#F97316',
  orangeSoft: '#fb923c',
  blue: '#4a9eff',
  green: '#4ade80',
  amber: '#fbbf24',
  red: '#f87171',
  cyan: '#22d3ee',
  purple: '#a78bfa',
  magenta: '#e879f9',
  slate: '#94a3b8',
  glass: 'rgba(255,255,255,0.04)',
  glassHi: 'rgba(255,255,255,0.07)',
  glassLine: 'rgba(255,255,255,0.09)',
  glassLineHi: 'rgba(255,255,255,0.14)',
  mono: "'JetBrains Mono', monospace",
  display: "'Space Grotesk', sans-serif",
  ui: "'Inter', sans-serif",
} as const;

export const SPECTRUM_CSS = `
:root{
  --sx-bg:#060708; --sx-bg2:#0a0c0e;
  --sx-ink:#f4f6f8; --sx-ink-dim:#8b939c; --sx-ink-faint:#525a63;
  --sx-orange:#F97316; --sx-orange-soft:#fb923c;
  --sx-blue:#4a9eff; --sx-green:#4ade80; --sx-amber:#fbbf24;
  --sx-red:#f87171; --sx-cyan:#22d3ee; --sx-purple:#a78bfa; --sx-magenta:#e879f9; --sx-slate:#94a3b8;
  --sx-glass:rgba(255,255,255,0.04); --sx-glass-hi:rgba(255,255,255,0.07);
  --sx-glass-line:rgba(255,255,255,0.09); --sx-glass-line-hi:rgba(255,255,255,0.14);
  --sx-mono:'JetBrains Mono',monospace; --sx-display:'Space Grotesk',sans-serif; --sx-ui:'Inter',sans-serif;
}
.sx-root{background:var(--sx-bg);color:var(--sx-ink);font-family:var(--sx-ui);-webkit-font-smoothing:antialiased;position:relative}
.sx-root::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(900px 600px at 12% -5%, rgba(249,115,22,0.09), transparent 60%),
    radial-gradient(1100px 700px at 95% 8%, rgba(74,158,255,0.09), transparent 55%),
    radial-gradient(800px 800px at 70% 100%, rgba(167,139,250,0.07), transparent 60%);}
.sx-glass{background:var(--sx-glass);border:1px solid var(--sx-glass-line);border-radius:20px;
  backdrop-filter:blur(22px) saturate(140%);-webkit-backdrop-filter:blur(22px) saturate(140%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 50px -30px rgba(0,0,0,0.8);}
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
