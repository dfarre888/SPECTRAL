'use client';
/**
 * OutcomePanel — the engagement verdict (Mockup Frames 04 & 09).
 * Reads an EngagementResult and renders a plain-language outcome with a
 * colour-coded glow and recommendations.
 */

import React from 'react';
import type { EngagementResult, Platform, OutcomeVerdict } from '@/lib/spectrum/types';

const VERDICT_STYLE: Record<
  OutcomeVerdict,
  { color: string; glow: string; glyph: string; tag: string }
> = {
  defeat_likely: {
    color: 'var(--sx-green)',
    glow: 'rgba(74,222,128,0.14)',
    glyph: '✓',
    tag: 'DEFEAT LIKELY',
  },
  partial: {
    color: 'var(--sx-amber)',
    glow: 'rgba(251,191,36,0.14)',
    glyph: '◐',
    tag: 'PARTIAL EFFECT',
  },
  no_engagement: {
    color: 'var(--sx-red)',
    glow: 'rgba(248,113,113,0.14)',
    glyph: '⃠',
    tag: 'NO ENGAGEMENT',
  },
  detect_only: {
    color: 'var(--sx-cyan)',
    glow: 'rgba(34,211,238,0.14)',
    glyph: '◎',
    tag: 'DETECT ONLY',
  },
};

export function OutcomePanel({
  result,
  red,
  blue,
}: {
  result: EngagementResult;
  red: Platform | null;
  blue: Platform | null;
}) {
  const s = VERDICT_STYLE[result.verdict];
  return (
    <div
      className="sx-glass-hi"
      style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden', borderRadius: 18 }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(80% 140% at 50% 130%, ${s.glow}, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            border: `1px solid ${s.color}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            color: s.color,
            flexShrink: 0,
          }}
        >
          {s.glyph}
        </div>
        <div style={{ flex: 1 }}>
          <div
            className="sx-mono"
            style={{ fontSize: 10, letterSpacing: '0.14em', color: s.color }}
          >
            OUTCOME · {s.tag}
          </div>
          <div
            className="sx-display"
            style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}
          >
            {result.headline}
          </div>
          <div
            className="sx-dim"
            style={{ fontSize: 12.5, marginTop: 7, maxWidth: '82ch', lineHeight: 1.55 }}
          >
            {result.detail}
          </div>
          {result.recommendations.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {result.recommendations.map((r, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11.5,
                    color: 'var(--sx-ink-dim)',
                    display: 'flex',
                    gap: 9,
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ color: s.color, fontSize: 10 }}>▸</span>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* uncovered dependencies, if partial */}
      {result.verdict === 'partial' && result.uncovered.length > 0 && (
        <div
          style={{
            position: 'relative',
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--sx-glass-line)',
          }}
        >
          <div className="sx-mono sx-faint" style={{ fontSize: 9, letterSpacing: '0.14em' }}>
            UNCOVERED BY {blue?.name?.toUpperCase() ?? 'EFFECTOR'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
            {result.uncovered.map((c) => (
              <span
                key={c.id}
                className="sx-mono"
                style={{
                  fontSize: 9.5,
                  padding: '4px 9px',
                  borderRadius: 7,
                  background: 'rgba(248,113,113,0.1)',
                  color: 'var(--sx-red)',
                }}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
