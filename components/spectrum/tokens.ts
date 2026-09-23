/**
 * Spectrum Intelligence — design tokens
 * Obsidian language (see DESIGN.md): lacquer for content, Liquid Glass for
 * controls. Import the CSS once at the app root; use the TS constants in
 * components where inline values are needed (SVG fills, etc.).
 */

export const TOKENS = {
  bg: '#000000',
  bg2: '#1D1D1F',
  ink: '#F5F5F7',
  inkDim: '#A1A1A6',
  inkFaint: '#86868B',
  // Chrome accent is blue app-wide; orange survives only as a data colour (IR).
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

/** Accredited (non-OSINT) waveform overlay colour. Neutral, so it never reads as a force or an IR band. */
export const ACCREDITED_COLOR = '#C7C7CC';

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
.sx-root{color:var(--sx-ink);font-family:var(--sx-ui);-webkit-font-smoothing:antialiased;position:relative}
/* Content panels are lacquer (HIG content layer): top-lit enamel, no blur. */
.sx-glass{background:var(--lacquer);border:1px solid var(--lacquer-line);box-shadow:var(--lacquer-shadow);border-radius:16px}
.sx-glass .sx-glass{background:rgba(255,255,255,0.025);box-shadow:inset 0 1px 0 rgba(255,255,255,0.05)}
.sx-glass-hi{border-color:rgba(255,255,255,0.16)}
.sx-mono{font-family:var(--sx-mono);font-variant-numeric:tabular-nums;}
.sx-display{font-family:var(--font-display),system-ui,sans-serif;}
.sx-dim{color:var(--sx-ink-dim);} .sx-faint{color:var(--sx-ink-faint);}
.sx-dot{display:inline-block;border-radius:50%;flex-shrink:0}

/* Side gutters match the app shell's page padding. */
.sx-pad{padding-left:16px;padding-right:16px}
@media (min-width:768px){.sx-pad{padding-left:28px;padding-right:28px}}
@media (min-width:1024px){.sx-pad{padding-left:40px;padding-right:40px}}

/* Module toolbar: transparent at rest, glass once content scrolls beneath it
   (the same scroll-edge effect as the app top bar). */
.sx-bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;flex-wrap:wrap;
  padding-top:10px;padding-bottom:10px;border-bottom:1px solid transparent;
  transition:background-color 220ms var(--ease-out),border-color 220ms var(--ease-out),box-shadow 220ms var(--ease-out)}
.sx-root[data-scrolled="true"] .sx-bar{background:rgba(10,10,12,0.62);-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);
  border-bottom-color:var(--glass-line);box-shadow:0 10px 30px -18px rgba(0,0,0,0.9)}
.sx-bar .seg{max-width:100%;overflow-x:auto;scrollbar-width:none}
.sx-bar .seg::-webkit-scrollbar{display:none}

/* Panel heading and caption. */
.sx-h{font-family:var(--font-display),system-ui,sans-serif;font-size:15px;font-weight:600;letter-spacing:-0.01em;color:var(--store-ink)}
.sx-cap{font-size:12px;color:var(--store-ink-mute)}
.sx-label{font-size:12px;font-weight:600;color:var(--store-ink-soft)}

/* Quiet glass pill (copilot suggestions, follow-ups). */
.sx-chip{display:inline-flex;align-items:center;min-height:28px;padding:0 12px;border-radius:999px;
  font-size:12px;line-height:1.2;color:var(--store-ink-soft);text-align:left;
  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07);
  transition:background-color 150ms ease-out,color 150ms ease-out,border-color 150ms ease-out}
.sx-chip:hover{background:rgba(255,255,255,0.09);color:var(--store-ink);border-color:rgba(255,255,255,0.18)}

/* Toggle switch (layers). */
.sx-switch{position:relative;width:30px;height:18px;border-radius:999px;flex-shrink:0;background:rgba(255,255,255,0.12);
  box-shadow:inset 0 1px 2px rgba(0,0,0,0.5);transition:background-color 160ms ease-out}
.sx-switch::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#D1D1D6;
  box-shadow:0 1px 2px rgba(0,0,0,0.5);transition:transform 160ms var(--ease-out),background-color 160ms ease-out}
.sx-switch[data-on="true"]::after{transform:translateX(12px);background:#fff}

/* Six-up instrument row (overview). */
.fc-inst.sx-six{grid-template-columns:repeat(6,minmax(0,1fr))}
@media (max-width:1100px){
  .fc-inst.sx-six{grid-template-columns:repeat(3,minmax(0,1fr))}
  .fc-inst.sx-six > div:nth-child(3n){border-right:0}
  .fc-inst.sx-six > div:nth-child(3n+1){padding-left:0}
  .fc-inst.sx-six > div:nth-child(n+4){border-top:1px solid var(--store-line)}
}

/* Selectable cards (gallery view). */
.sx-card{text-align:left;cursor:pointer;transition:border-color 150ms ease-out,box-shadow 150ms ease-out}
.sx-card:hover{border-color:rgba(255,255,255,0.2)}
.sx-card[aria-pressed="true"]{border-color:rgba(41,151,255,0.6);box-shadow:var(--lacquer-shadow),0 0 0 1px rgba(41,151,255,0.35)}

/* Wide DataTables: honour the declared column widths and scroll sideways
   inside the frame (first column pinned) instead of squashing columns. */
.sx-dt-fixed .dt{table-layout:fixed;min-width:var(--sx-dt-min,100%)}

/* Name-as-link inside a table row. */
.sx-link{color:var(--store-ink);font-weight:500;text-align:left}
.sx-link:hover{color:#fff;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(255,255,255,0.4)}

@media (prefers-reduced-motion: reduce){
  .sx-bar,.sx-chip,.sx-switch,.sx-switch::after,.sx-card{transition:none}
}
@media (prefers-reduced-transparency: reduce){
  .sx-root[data-scrolled="true"] .sx-bar{background:#141416;-webkit-backdrop-filter:none;backdrop-filter:none}
}
`;

/** Layer → token colour, mirrors lib/spectrum/scale.ts LAYER_COLOR. */
export const LAYER_TOKEN = {
  comms: TOKENS.cyan,
  navigation: TOKENS.green,
  radar: TOKENS.amber,
  eo_ir: TOKENS.magenta,
  cbrn: TOKENS.slate,
} as const;
