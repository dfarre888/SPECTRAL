'use client';
/**
 * OutcomePanel — the engagement verdict (Mockup Frames 04 & 09).
 * Reads an EngagementResult and renders a plain-language outcome: a coloured
 * verdict tag, the headline, the reasoning and recommendations.
 */

import React from 'react';
import type { EngagementResult, Platform, OutcomeVerdict } from '@/lib/spectrum/types';

const VERDICT_STYLE: Record<OutcomeVerdict, { color: string; tag: string; label: string; glyph: string }> = {
  defeat_likely: { color: 'var(--sx-green)', tag: 'tag green', label: 'Defeat likely', glyph: '✓' },
  partial: { color: 'var(--sx-amber)', tag: 'tag amber', label: 'Partial effect', glyph: '◐' },
  no_engagement: { color: 'var(--sx-red)', tag: 'tag red', label: 'No engagement', glyph: '⃠' },
  detect_only: { color: 'var(--sx-cyan)', tag: 'tag', label: 'Detect only', glyph: '◎' },
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
    <section className="sx-glass" style={{ padding: '20px 22px' }} aria-label="Engagement outcome">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: `1px solid ${s.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: s.color,
            flexShrink: 0,
            opacity: 0.9,
          }}
        >
          {s.glyph}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              className={s.tag}
              style={result.verdict === 'detect_only' ? { color: '#67E8F9', borderColor: 'rgba(6,182,212,0.45)', background: 'rgba(6,182,212,0.08)' } : undefined}
            >
              {s.label}
            </span>
            {red && blue && (
              <span className="sx-cap">
                {red.name} vs {blue.name}
              </span>
            )}
          </div>
          <h3 className="sx-display" style={{ fontWeight: 600, fontSize: 17, marginTop: 8, color: 'var(--store-ink)', lineHeight: 1.35 }}>
            {result.headline}
          </h3>
          <p style={{ fontSize: 13, marginTop: 6, maxWidth: '82ch', lineHeight: 1.6, color: 'var(--store-ink-soft)' }}>{result.detail}</p>
          {result.recommendations.length > 0 && (
            <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.recommendations.map((r, i) => (
                <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--store-ink-soft)', display: 'flex', gap: 9 }}>
                  <span aria-hidden style={{ color: s.color }}>›</span>
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* uncovered dependencies, if partial */}
      {result.verdict === 'partial' && result.uncovered.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--store-line)' }}>
          <div className="sx-label">Not covered by {blue?.name ?? 'the effector'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {result.uncovered.map((c) => (
              <span key={c.id} className="tag red">
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
