'use client';
/**
 * AeroCopilotDock — the persistent, always-available Level-4 assistant.
 * A Liquid Glass bar floating at the bottom of the spectrum content area (the
 * parent positions it; it never covers the app sidebar). The user types a
 * question; the dock runs the reasoning engine (offline) or the Claude API,
 * shows the answer + reasoning, and fires actions that navigate the app and
 * pre-select / highlight platforms and radars. It can be minimised to a pill
 * so it never hides data.
 *
 * Honesty rules: every answer names the engine that produced it and the
 * library records it cites, and is written to the append-only AI audit log.
 * In offline mode (the default) no request leaves for a model: the rules
 * engine answers instantly in the browser and only the audit entry is posted
 * to this instance.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ChevronDown, ChevronUp, Cpu, Minus, Sparkles } from 'lucide-react';
import type { Platform } from '@/lib/spectrum/types';
import type { RadarSystem } from '@/lib/spectrum/radar-types';
import type { EffectorSystem } from '@/lib/spectrum/effector-types';
import { askCopilot, CopilotResponse, CopilotAction } from '@/lib/spectrum/aerocopilot';
import {
  ADVICE_ONLY,
  OFFLINE_ENGINE,
  type AiEngineInfo,
  type AiModeStatus,
  type AuditReceipt,
  type EngineCopilotResponse,
} from '@/lib/spectrum/aerocopilot-engine';

export interface AeroCopilotDockProps {
  platforms: Platform[];
  radars: RadarSystem[];
  effectors?: EffectorSystem[];
  onAction: (action: CopilotAction) => void;
  /** Reports the dock's rendered height so the host can pad its scroller. */
  onHeightChange?: (height: number) => void;
}

interface Turn {
  id: number;
  role: 'user' | 'copilot';
  text: string;
  reasoning?: string[];
  followups?: string[];
  refs?: { id: string; name: string; side: string }[];
  /** The engine that actually produced this answer. */
  engine?: AiEngineInfo;
  /** Bedrock was selected but failed, so the offline engine answered. */
  fallback?: boolean;
  audit?: 'pending' | 'failed' | AuditReceipt;
}

const MIN_KEY = 'spectra.copilot.minimised';

const SUGGESTIONS = [
  'Where should I place my defensive systems?',
  'What drones can I use against an S-400?',
  'DroneGun vs Shahed-136?',
  'What band is the Big Bird radar on?',
];

export function AeroCopilotDock({ platforms, radars, effectors = [], onAction, onHeightChange }: AeroCopilotDockProps) {
  const [open, setOpen] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  // Suggestions show while the dock has focus, so the resting bar stays one line tall.
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const turnId = useRef(0);
  // Which engine answers on this instance. Until the server says otherwise the
  // dock assumes offline, which is also the server default.
  const [mode, setMode] = useState<AiModeStatus | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/aerocopilot', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<AiModeStatus>) : null))
      .then((m) => {
        if (live && m?.engine) setMode(m);
      })
      .catch(() => {
        /* offline default stands */
      });
    return () => {
      live = false;
    };
  }, []);
  const activeEngine = mode?.engine ?? OFFLINE_ENGINE;

  // Remember a minimised dock per viewer (convenience only).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(MIN_KEY) === '1') setMinimised(true);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const setMin = (v: boolean) => {
    setMinimised(v);
    try {
      window.localStorage.setItem(MIN_KEY, v ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, open, thinking]);

  useEffect(() => {
    const el = dockRef.current;
    if (!el || !onHeightChange) return;
    const report = () => onHeightChange(el.getBoundingClientRect().height);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeightChange, minimised]);

  const patchTurn = (id: number, patch: Partial<Turn>) =>
    setTurns((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  /** Offline answers are computed here, so the browser reports them to the audit log. */
  const logOffline = async (id: number, q: string, res: CopilotResponse, fallback: boolean) => {
    try {
      const r = await fetch('/api/v1/ai-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'aerocopilot',
          question: q,
          engine: 'offline',
          answer: res.answer,
          refs: res.refs ?? [],
          fallback,
        }),
        keepalive: true,
      });
      patchTurn(id, { audit: r.ok ? ((await r.json()) as AuditReceipt) : 'failed' });
    } catch {
      patchTurn(id, { audit: 'failed' });
    }
  };

  const run = async (q: string) => {
    if (!q.trim()) return;
    setTurns((t) => [...t, { id: ++turnId.current, role: 'user', text: q }]);
    setInput('');
    setOpen(true);
    setMin(false);

    let res: CopilotResponse | null = null;
    let engine: AiEngineInfo = OFFLINE_ENGINE;
    let audit: Turn['audit'] = 'pending';
    let fallback = false;

    if (activeEngine.engine === 'bedrock') {
      setThinking(true);
      // A hung request should not leave the dock reasoning forever in a briefing:
      // after 25 s the offline engine answers instead, and says so.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        const apiRes = await fetch('/api/aerocopilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, platforms, radars, effectors }),
          signal: ctrl.signal,
        });
        if (apiRes.ok) {
          const body = (await apiRes.json()) as EngineCopilotResponse;
          res = body;
          engine = body.engine;
          audit = body.audit ?? 'failed';
        }
      } catch {
        // fall through to offline engine
      } finally {
        clearTimeout(timer);
      }
      setThinking(false);
      if (!res) fallback = true;
    }

    if (!res) {
      res = askCopilot(q, { platforms, radars, effectors });
      engine = OFFLINE_ENGINE;
      audit = 'pending';
    }

    const id = ++turnId.current;
    setTurns((t) => [
      ...t,
      {
        id,
        role: 'copilot',
        text: res.answer,
        reasoning: res.reasoning,
        followups: res.followups,
        refs: res.refs,
        engine,
        fallback,
        audit,
      },
    ]);
    if (res.action) onAction(res.action);
    if (engine.engine === 'offline') void logOffline(id, q, res, fallback);
  };

  if (minimised) {
    return (
      <div ref={dockRef} className="sx-dock-host sx-pad" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="lg-glass"
          onClick={() => {
            setMin(false);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          aria-label="Open AeroCopilot"
          style={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            height: 44,
            padding: '0 16px 0 8px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--store-ink)',
          }}
        >
          <CopilotMark />
          Ask AeroCopilot
          {turns.length > 0 && (
            <span className="sx-mono sx-faint" style={{ fontSize: 12 }}>
              {turns.filter((t) => t.role === 'copilot').length}
            </span>
          )}
        </button>
        <DockStyles />
      </div>
    );
  }

  const hasText = input.trim().length > 0;

  return (
    <div ref={dockRef} className="sx-dock-host sx-pad">
      <div
        className="lg-glass"
        role="region"
        aria-label="AeroCopilot"
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
        style={{ width: 'min(920px, 100%)', borderRadius: 22, pointerEvents: 'auto', overflow: 'hidden' }}
      >
        {/* transcript (collapsible) */}
        {open && (
          <div
            ref={scrollRef}
            aria-live="polite"
            style={{
              maxHeight: 'min(320px, 40vh)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: '16px 18px 6px',
              borderBottom: '1px solid var(--glass-line)',
              // Dimming layer: long answers stay legible over busy charts (HIG regular glass).
              background: 'rgba(8, 8, 10, 0.55)',
            }}
          >
            {turns.length === 0 && (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--store-ink-soft)', margin: 0, maxWidth: '72ch' }}>
                <b style={{ color: 'var(--store-ink)', fontWeight: 600 }}>AeroCopilot</b> reasons over every platform,
                radar and band in the library. Ask it to place defences on the map, find which drones survive a threat
                picture, run a what-if engagement, or explain a radar. It opens the right view and highlights what to
                pick.
                <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--store-ink-mute)' }}>
                  {activeEngine.engine === 'offline'
                    ? 'Answers come from the offline engine: no data leaves this instance.'
                    : `Answers come from ${activeEngine.label}.`}{' '}
                  {ADVICE_ONLY}
                </span>
              </p>
            )}
            {turns.map((t) => (
              <Bubble key={t.id} turn={t} onFollowup={run} />
            ))}
            {thinking && (
              <div className="sx-mono" style={{ fontSize: 12, color: 'var(--store-ink-mute)', padding: '4px 0 10px' }}>
                Reasoning<span className="sx-dots">…</span>
              </div>
            )}
          </div>
        )}

        {/* input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 8px 10px' }}>
          <CopilotMark />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run(input);
              if (e.key === 'Escape') {
                if (open) setOpen(false);
                else (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label="Ask AeroCopilot"
            placeholder="Ask AeroCopilot: placement, what-ifs, threat survivability, radar bands"
            style={{
              flex: 1,
              minWidth: 0,
              height: 36,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--store-ink)',
              fontSize: 14,
              fontFamily: 'var(--sx-ui)',
            }}
          />
          {turns.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="glass-icon-btn"
              aria-label={open ? 'Hide conversation' : 'Show conversation'}
              aria-expanded={open}
              title={open ? 'Hide conversation' : 'Show conversation'}
            >
              {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMin(true)}
            className="glass-icon-btn"
            aria-label="Minimise AeroCopilot"
            title="Minimise"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={() => run(input)}
            disabled={!hasText}
            className={hasText ? 'btn-glass primary' : 'btn-glass'}
            aria-label="Ask"
            style={{ minHeight: 34, width: 34, padding: 0, borderRadius: 999, opacity: hasText ? 1 : 0.55 }}
          >
            <ArrowUp size={16} />
          </button>
        </div>

        {/* suggestion chips (before the first turn, while the dock has focus) */}
        {turns.length === 0 && focused && (
          <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px', flexWrap: 'wrap' }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(s)}
                className="sx-chip"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <DockStyles />
    </div>
  );
}

function CopilotMark() {
  return (
    <span
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#fff',
        background: 'linear-gradient(180deg, #3AA2FF, #1F86EE)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 12px -4px rgba(41,151,255,0.8)',
      }}
    >
      <Sparkles size={14} />
    </span>
  );
}

function DockStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        .sx-dock-host{position:absolute;left:0;right:0;bottom:14px;z-index:30;display:flex;justify-content:center;pointer-events:none}
        .sx-dots{animation:sxblink 1.4s infinite}
        @keyframes sxblink{0%,100%{opacity:0.3}50%{opacity:1}}
        @media (prefers-reduced-motion: reduce){.sx-dots{animation:none}}
      `,
      }}
    />
  );
}

function Bubble({ turn, onFollowup }: { turn: Turn; onFollowup: (q: string) => void }) {
  if (turn.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div
          style={{
            padding: '8px 14px',
            borderRadius: '16px 16px 4px 16px',
            fontSize: 13,
            lineHeight: 1.5,
            maxWidth: '78%',
            color: '#fff',
            background: 'rgba(41,151,255,0.22)',
            border: '1px solid rgba(41,151,255,0.35)',
          }}
        >
          {turn.text}
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16, maxWidth: '88%' }}>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--store-ink)' }}>{turn.text}</div>
      {turn.reasoning && turn.reasoning.length > 0 && (
        <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {turn.reasoning.map((r, i) => (
            <li key={i} style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--store-ink-soft)', display: 'flex', gap: 8 }}>
              <span aria-hidden style={{ color: 'var(--store-ink-mute)' }}>
                ›
              </span>
              {r}
            </li>
          ))}
        </ul>
      )}
      <div
        style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}
        title="Platform library records this answer draws on. Each record lists its open sources in its dossier."
      >
        <span style={{ fontSize: 11.5, color: 'var(--store-ink-mute)', marginRight: 2 }}>Sources</span>
        {turn.refs && turn.refs.length > 0 ? (
          turn.refs.map((r) => (
            <span key={r.id} className={`tag ${r.side === 'red' ? 'red' : r.side === 'blue' ? 'blue' : ''}`}>
              {r.name}
            </span>
          ))
        ) : (
          <span style={{ fontSize: 11.5, color: 'var(--store-ink-mute)' }}>No library records cited</span>
        )}
      </div>
      {turn.followups && turn.followups.length > 0 && (
        <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
          {turn.followups.map((f) => (
            <button key={f} type="button" onClick={() => onFollowup(f)} className="sx-chip">
              {f}
            </button>
          ))}
        </div>
      )}
      {turn.engine && <Provenance turn={turn} />}
    </div>
  );
}

/** Engine, human accountability and audit receipt, under every answer. */
function Provenance({ turn }: { turn: Turn }) {
  const engine = turn.engine!;
  const audit = turn.audit;
  const auditText =
    audit === 'pending' ? 'Logging' : audit === 'failed' || !audit ? 'Not logged' : `Logged ${audit.answerSha256.slice(0, 8)}`;
  const auditTitle =
    audit && typeof audit === 'object'
      ? `Audit entry ${audit.id}, ${audit.store === 'local' ? 'stored locally on this instance' : 'stored in the database'}. SHA-256 of this answer: ${audit.answerSha256}`
      : audit === 'failed'
        ? 'The audit log could not be written for this answer.'
        : undefined;
  return (
    <div
      className="sx-prov"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '4px 12px',
        marginTop: 10,
        paddingTop: 8,
        borderTop: '1px solid var(--glass-line)',
        fontSize: 11.5,
        lineHeight: 1.4,
        color: 'var(--store-ink-mute)',
      }}
    >
      <span
        title={`${engine.detail}${engine.modelId ? ` Model ${engine.modelId}.` : ''}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--store-ink-soft)' }}
      >
        {engine.engine === 'offline' ? <Cpu size={12} aria-hidden /> : <Sparkles size={12} aria-hidden />}
        {engine.label}
        {turn.fallback ? ' (model unavailable, offline answer)' : ''}
      </span>
      <span>{ADVICE_ONLY}</span>
      <span className="sx-mono" title={auditTitle} style={{ color: audit === 'failed' ? '#FCD34D' : undefined }}>
        {auditText}
      </span>
    </div>
  );
}
