'use client';

import { useMemo, useState } from 'react';
import { simulateSalvoDeterministic } from '@/lib/planner/engagement-economics';

export function SalvoSimulator() {
  const [threats, setThreats] = useState(8);
  const [magazine, setMagazine] = useState(6);
  const [pk, setPk] = useState(0.7);
  const result = useMemo(() => simulateSalvoDeterministic(magazine, 1, pk, threats), [magazine, pk, threats]);
  return (
    <div className="space-y-3 font-mono text-xs">
      <label className="flex justify-between gap-2">Threats <input type="number" min={1} max={50} value={threats} onChange={(e) => setThreats(Number(e.target.value))} className="w-16 bg-[var(--store-surface-2)] border border-[var(--store-line)] rounded px-1" /></label>
      <label className="flex justify-between gap-2">Magazine <input type="number" min={1} max={100} value={magazine} onChange={(e) => setMagazine(Number(e.target.value))} className="w-16 bg-[var(--store-surface-2)] border border-[var(--store-line)] rounded px-1" /></label>
      <label className="flex justify-between gap-2">Pk/shot <input type="number" min={0.1} max={0.99} step={0.05} value={pk} onChange={(e) => setPk(Number(e.target.value))} className="w-16 bg-[var(--store-surface-2)] border border-[var(--store-line)] rounded px-1" /></label>
      <p className="text-cyan">Leak-through: {(result.leakThroughProbability * 100).toFixed(0)}%</p>
      <p className="store-text-body">Rounds expended: {result.roundsExpended}</p>
    </div>
  );
}
