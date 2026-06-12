'use client';
/**
 * AeroCopilotDock — the persistent, always-available Level-4 assistant.
 * Sits fixed at the bottom of every screen. The user types a question; the
 * dock runs the reasoning engine (offline) or the Claude API (wired in Cursor),
 * shows the answer + reasoning, and fires actions that navigate the app and
 * pre-select / highlight platforms and radars.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Platform } from '@/lib/spectrum/types';
import type { RadarSystem } from '@/lib/spectrum/radar-types';
import type { EffectorSystem } from '@/lib/spectrum/effector-types';
import { askCopilot, CopilotResponse, CopilotAction } from '@/lib/spectrum/aerocopilot';

export interface AeroCopilotDockProps {
  platforms: Platform[];
  radars: RadarSystem[];
  effectors?: EffectorSystem[];
  onAction: (action: CopilotAction) => void;
}

interface Turn {
  role: 'user' | 'copilot';
  text: string;
  reasoning?: string[];
  followups?: string[];
  refs?: { id: string; name: string; side: string }[];
}

export function AeroCopilotDock({ platforms, radars, effectors = [], onAction }: AeroCopilotDockProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, open]);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setTurns((t) => [...t, { role: 'user', text: q }]);
    setInput('');
    setThinking(true);
    setOpen(true);

    let res: CopilotResponse | null = null;

    try {
      const apiRes = await fetch('/api/aerocopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, platforms, radars, effectors }),
      });
      if (apiRes.ok) {
        res = (await apiRes.json()) as CopilotResponse;
      }
    } catch {
      // fall through to offline engine
    }

    if (!res) {
      await new Promise((r) => setTimeout(r, 280));
      res = askCopilot(q, { platforms, radars, effectors });
    }

    setThinking(false);

    setTurns((t) => [
      ...t,
      {
        role: 'copilot',
        text: res.answer,
        reasoning: res.reasoning,
        followups: res.followups,
        refs: res.refs,
      },
    ]);
    if (res.action) onAction(res.action);
  };

  const suggestions = [
    'Where should I place my defensive systems?',
    'What drones can I use against an S-400?',
    'DroneGun vs Shahed-136?',
    'What band is the Big Bird radar on?',
  ];

  return (
    <>
      {/* spacer so content isn't hidden behind the dock */}
      <div style={{ height: open ? 360 : 84 }} />

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 60,
          padding: '0 24px 18px',
          pointerEvents: 'none',
        }}
      >
        <div
          className="sx-glass-hi"
          style={{
            maxWidth: 1320,
            margin: '0 auto',
            borderRadius: 20,
            pointerEvents: 'auto',
            overflow: 'hidden',
            border: '1px solid rgba(249,115,22,0.25)',
            boxShadow: '0 -10px 60px -20px rgba(0,0,0,0.9), 0 0 80px -40px rgba(249,115,22,0.4)',
          }}
        >
          {/* transcript (collapsible) */}
          {open && (
            <div
              ref={scrollRef}
              style={{
                maxHeight: 280,
                overflowY: 'auto',
                padding: '18px 20px 6px',
                borderBottom: '1px solid var(--sx-glass-line)',
              }}
            >
              {turns.length === 0 && (
                <div className="sx-dim" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                  I'm <b style={{ color: 'var(--sx-ink)' }}>AeroCopilot</b> — I reason over every platform, radar, and band in the system. Ask me to place defences on the map, find which drones survive a threat picture, run a what-if engagement, or explain any radar. I'll take you to the right screen and highlight what to pick.
                </div>
              )}
              {turns.map((t, i) => (
                <Bubble key={i} turn={t} onFollowup={run} />
              ))}
              {thinking && (
                <div className="sx-mono" style={{ fontSize: 11, color: 'var(--sx-orange-soft)', padding: '6px 0' }}>
                  AeroCopilot is reasoning<span className="sx-dots">…</span>
                </div>
              )}
            </div>
          )}

          {/* input row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'linear-gradient(135deg, var(--sx-orange), #c2410c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 6px 18px -6px var(--sx-orange)',
              }}
            >
              <span style={{ fontSize: 15 }}>◆</span>
            </div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && run(input)}
              onFocus={() => setOpen(true)}
              placeholder="Ask AeroCopilot — placement, what-ifs, threat survivability, radar bands…"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--sx-ink)',
                fontSize: 13.5,
                fontFamily: 'var(--sx-ui)',
              }}
            />
            {turns.length > 0 && (
              <button
                onClick={() => setOpen((o) => !o)}
                className="sx-glass"
                style={{ padding: '6px 10px', borderRadius: 9, fontSize: 11, color: 'var(--sx-ink-dim)', border: '1px solid var(--sx-glass-line)', cursor: 'pointer' }}
              >
                {open ? 'Hide' : 'Show'}
              </button>
            )}
            <button
              onClick={() => run(input)}
              style={{
                padding: '9px 16px',
                borderRadius: 11,
                fontSize: 12.5,
                fontWeight: 600,
                background: 'var(--sx-orange)',
                color: '#0a0c0e',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Ask
            </button>
          </div>

          {/* suggestion chips (only before first turn) */}
          {turns.length === 0 && (
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', flexWrap: 'wrap' }}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => run(s)}
                  className="sx-glass"
                  style={{ padding: '7px 12px', borderRadius: 99, fontSize: 11, color: 'var(--sx-ink-dim)', border: '1px solid var(--sx-glass-line)', cursor: 'pointer' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sx-dots{animation:sxblink 1.4s infinite}
        @keyframes sxblink{0%,100%{opacity:0.3}50%{opacity:1}}
      ` }} />
    </>
  );
}

function Bubble({ turn, onFollowup }: { turn: Turn; onFollowup: (q: string) => void }) {
  if (turn.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div
          className="sx-glass"
          style={{ padding: '9px 14px', borderRadius: '14px 14px 4px 14px', fontSize: 12.5, maxWidth: '78%', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}
        >
          {turn.text}
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16, maxWidth: '88%' }}>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sx-ink)' }}>{turn.text}</div>
      {turn.reasoning && turn.reasoning.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {turn.reasoning.map((r, i) => (
            <div key={i} style={{ fontSize: 11.5, color: 'var(--sx-ink-dim)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ color: 'var(--sx-orange-soft)', fontSize: 9 }}>▸</span>
              {r}
            </div>
          ))}
        </div>
      )}
      {turn.refs && turn.refs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
          {turn.refs.map((r) => (
            <span
              key={r.id}
              className="sx-mono"
              style={{
                fontSize: 9.5,
                padding: '3px 9px',
                borderRadius: 7,
                background: r.side === 'red' ? 'rgba(248,113,113,0.12)' : r.side === 'blue' ? 'rgba(74,158,255,0.12)' : 'rgba(255,255,255,0.06)',
                color: r.side === 'red' ? 'var(--sx-red)' : r.side === 'blue' ? 'var(--sx-blue)' : 'var(--sx-ink-dim)',
              }}
            >
              {r.name}
            </span>
          ))}
        </div>
      )}
      {turn.followups && turn.followups.length > 0 && (
        <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
          {turn.followups.map((f) => (
            <button
              key={f}
              onClick={() => onFollowup(f)}
              className="sx-glass"
              style={{ padding: '6px 11px', borderRadius: 99, fontSize: 10.5, color: 'var(--sx-ink-dim)', border: '1px solid var(--sx-glass-line)', cursor: 'pointer' }}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
