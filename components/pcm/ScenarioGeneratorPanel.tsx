'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ScenarioConfiguration } from '@/lib/pcm/scenario-generator-engine';
import type { PCM } from '@/lib/pcm/spectral.types';

export function ScenarioGeneratorPanel() {
  const router = useRouter();
  const [config, setConfig] = useState<ScenarioConfiguration | null>(null);
  const [loading, setLoading] = useState(false);
  const [startingExercise, setStartingExercise] = useState(false);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [callsign, setCallsign] = useState('TRAINEE');
  const [scenarioCode, setScenarioCode] = useState<string | null>(null);
  const [scenarioRowId, setScenarioRowId] = useState<string | null>(null);
  const [sessionDsPlayerId, setSessionDsPlayerId] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setExerciseError(null);
    try {
      const res = await fetch('/api/spectral/scenario-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, callsign }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfig(data as ScenarioConfiguration);
        setScenarioCode(typeof data.scenario_code === 'string' ? data.scenario_code : null);
        setScenarioRowId(typeof data.scenario_row_id === 'string' ? data.scenario_row_id : null);
        setSessionDsPlayerId(typeof data.ds_player_id === 'string' ? data.ds_player_id : null);
      }
    } finally { setLoading(false); }
  }

  async function startExercise() {
    if (!scenarioRowId) {
      setExerciseError('No scenario ID — generate a scenario first.');
      return;
    }
    const dsPlayerId = playerId.trim() || sessionDsPlayerId;
    if (!dsPlayerId) {
      setExerciseError('Enter player_id or sign in as a DS player.');
      return;
    }

    setStartingExercise(true);
    setExerciseError(null);
    try {
      const body: PCM.CreateExerciseRequest = {
        scenario_id: scenarioRowId,
        ds_player_id: dsPlayerId,
        difficulty: 'base',
        red_player_id: null,
        blue_player_id: null,
        blind_mode: false,
      };
      const res = await fetch('/api/spectral/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as PCM.CreateExerciseResponse & { error?: string };
      if (!res.ok || data.error) {
        setExerciseError(typeof data.error === 'string' ? data.error : 'Failed to create exercise');
        return;
      }
      if (typeof data.exercise_id === 'string' && data.exercise_id) {
        router.push(`/pcm/exercise/${data.exercise_id}`);
      } else {
        setExerciseError('Exercise created but no ID returned.');
      }
    } catch {
      setExerciseError('Network error creating exercise.');
    } finally {
      setStartingExercise(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex flex-wrap gap-2">
        <input className="rounded border border-[var(--store-line)] bg-black/40 px-2 py-1 text-xs font-mono" placeholder="player_id" value={playerId} onChange={(e) => setPlayerId(e.target.value)} />
        <input className="rounded border border-[var(--store-line)] bg-black/40 px-2 py-1 text-xs font-mono" placeholder="callsign" value={callsign} onChange={(e) => setCallsign(e.target.value)} />
        <button type="button" onClick={generate} disabled={loading} className="rounded bg-[var(--store-accent)] px-3 py-1 text-xs font-mono text-black">{loading ? 'Generating…' : 'Generate'}</button>
      </div>
      {config && (
        <div className="store-panel rounded-xl border p-4 text-sm space-y-3">
          <h3 className="font-mono text-[var(--store-accent)]">{config.title}</h3>
          <p className="text-xs store-text-muted">{config.generation_rationale}</p>
          <p className="font-mono text-[10px] text-cyan">Pd: {config.estimated_pd_envelope.under_trigger_pd.toFixed(3)} under trigger</p>
          {scenarioCode && (
            <p className="font-mono text-[10px] text-white">Scenario code: <span className="text-cyan">{scenarioCode}</span></p>
          )}
          {scenarioRowId && (
            <p className="font-mono text-[10px] store-text-muted">Row ID: <span className="text-white">{scenarioRowId}</span></p>
          )}
          {exerciseError && (
            <p className="text-[10px] font-mono text-red">{exerciseError}</p>
          )}
          <div className="border-t border-[var(--store-line)] pt-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider store-text-muted">Next steps</p>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={startExercise}
                disabled={startingExercise || !scenarioRowId}
                className="rounded bg-[var(--store-accent)] px-2 py-1 text-black disabled:opacity-50"
              >
                {startingExercise ? 'Starting…' : 'Start PCM Exercise'}
              </button>
              <Link href="/arena" className="rounded border border-[var(--store-line)] px-2 py-1 hover:border-[var(--store-accent)]/40">WOPR Arena</Link>
              <Link href="/map" className="rounded border border-[var(--store-line)] px-2 py-1 hover:border-[var(--store-accent)]/40">Map Intel</Link>
              <Link href="/pcm" className="rounded border border-[var(--store-line)] px-2 py-1 hover:border-[var(--store-accent)]/40">PCM hub</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
