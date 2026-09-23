'use client';

import { useMemo, useState } from 'react';
import { simulateSalvoDeterministic } from '@/lib/planner/engagement-economics';

function leakInk(p: number) {
  if (p <= 0) return '#4ADE80';
  if (p <= 0.25) return '#FCD34D';
  return 'var(--wb-red)';
}

function NumberField({
  label, value, onChange, min, max, step,
}: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs store-text-muted">{label}</span>
      <input
        type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="glass-field h-9 w-full px-3 font-mono text-[13px] tabular-nums"
      />
    </label>
  );
}

export function SalvoSimulator() {
  const [threats, setThreats] = useState(8);
  const [magazine, setMagazine] = useState(6);
  const [pk, setPk] = useState(0.7);
  const result = useMemo(() => simulateSalvoDeterministic(magazine, 1, pk, threats), [magazine, pk, threats]);

  // Threats that leak, as whole threats, for the strip below.
  const pips = Math.max(0, Math.min(50, Math.round(threats) || 0));
  const leaked = Math.round(result.leakThroughProbability * pips);
  const magUsed = magazine > 0 ? Math.min(1, result.roundsExpended / magazine) : 0;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
      <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
        <NumberField label="Threats" value={threats} onChange={setThreats} min={1} max={50} />
        <NumberField label="Magazine (rounds)" value={magazine} onChange={setMagazine} min={1} max={100} />
        <NumberField label="Pk per shot" value={pk} onChange={setPk} min={0.1} max={0.99} step={0.05} />
      </div>

      <div className="min-w-0 space-y-5">
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-xs store-text-muted">Leak-through</dt>
            <dd className="mt-1.5 font-mono text-[28px] leading-none tabular-nums" style={{ color: leakInk(result.leakThroughProbability) }}>
              {(result.leakThroughProbability * 100).toFixed(0)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs store-text-muted">Expected kills</dt>
            <dd className="mt-1.5 font-mono text-[28px] leading-none tabular-nums text-[var(--store-ink)]">
              {result.expectedKills}
            </dd>
          </div>
          <div>
            <dt className="text-xs store-text-muted">Rounds expended</dt>
            <dd className="mt-1.5 font-mono text-[28px] leading-none tabular-nums text-[var(--store-ink)]">
              {result.roundsExpended}
            </dd>
          </div>
        </dl>

        <div>
          <p className="mb-2 flex justify-between text-xs store-text-muted">
            <span>Inbound threats</span>
            <span className="font-mono">{leaked} of {pips} leak</span>
          </p>
          <div className="flex flex-wrap gap-1.5" aria-hidden>
            {Array.from({ length: pips }, (_, i) => {
              const isLeak = i >= pips - leaked;
              return (
                <span
                  key={i}
                  className="h-3 w-3 rounded-full"
                  style={
                    isLeak
                      ? { background: 'var(--wb-red)', boxShadow: '0 0 10px -2px rgba(255,92,110,0.8)' }
                      : { border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.06)' }
                  }
                />
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 flex justify-between text-xs store-text-muted">
            <span>Magazine used</span>
            <span className="font-mono">{result.roundsExpended} of {magazine}</span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)]">
            <div
              className="h-full rounded-full bg-[var(--wb-blue)] transition-[width] duration-200 ease-out motion-reduce:transition-none"
              style={{ width: `${magUsed * 100}%` }}
            />
          </div>
        </div>

        <p className="text-xs leading-relaxed store-text-muted">
          Deterministic model, one round fired per engagement.
        </p>
      </div>
    </div>
  );
}
