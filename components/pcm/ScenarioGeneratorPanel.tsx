
'use client';
import { useState } from 'react';
import type { ScenarioConfiguration } from '@/lib/pcm/scenario-generator-engine';

export function ScenarioGeneratorPanel() {
  const [config, setConfig] = useState<ScenarioConfiguration | null>(null);
  const [loading, setLoading] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [callsign, setCallsign] = useState('TRAINEE');

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/spectral/scenario-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, callsign }),
      });
      if (res.ok) setConfig(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex flex-wrap gap-2">
        <input className="rounded border border-[var(--store-line)] bg-black/40 px-2 py-1 text-xs font-mono" placeholder="player_id" value={playerId} onChange={(e) => setPlayerId(e.target.value)} />
        <input className="rounded border border-[var(--store-line)] bg-black/40 px-2 py-1 text-xs font-mono" placeholder="callsign" value={callsign} onChange={(e) => setCallsign(e.target.value)} />
        <button type="button" onClick={generate} disabled={loading} className="rounded bg-[var(--store-accent)] px-3 py-1 text-xs font-mono text-black">{loading ? 'Generating…' : 'Generate'}</button>
      </div>
      {config && (
        <div className="store-panel rounded-xl border p-4 text-sm">
          <h3 className="font-mono text-[var(--store-accent)]">{config.title}</h3>
          <p className="text-xs store-text-muted">{config.generation_rationale}</p>
          <p className="font-mono text-[10px] text-cyan">Pd: {config.estimated_pd_envelope.under_trigger_pd.toFixed(3)} under trigger</p>
        </div>
      )}
    </div>
  );
}
