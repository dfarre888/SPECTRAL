"use client";

import { useState } from "react";
import Link from "next/link";

interface TurnControlPanelProps {
  exerciseId: string;
  currentTurn: number;
  status: string;
  training?: boolean;
  onTurnAdvanced?: () => void;
}

export function TurnControlPanel({ exerciseId, currentTurn, status, training, onTurnAdvanced }: TurnControlPanelProps) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const advanceTurn = async () => {
    if (training) {
      setMsg("Training fixture — turn frozen at instructor snapshot");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/spectral/exercises/${exerciseId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_advance: true }),
      });
      if (!res.ok) throw new Error("Turn advance failed");
      setMsg("Turn advanced");
      onTurnAdvanced?.();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  const startExercise = async () => {
    if (training) {
      setMsg("Training fixture already active");
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/spectral/exercises/${exerciseId}/start`, { method: "POST" });
      setMsg("Exercise started");
      onTurnAdvanced?.();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  const turnLabel = currentTurn > 0 ? currentTurn : status === 'loading' ? '…' : '—';

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--store-line)] bg-[var(--store-surface-2)] px-3 py-2">
      <span className="text-[10px] font-mono store-text-muted">
        Turn <span className="text-white tabular-nums">{turnLabel}</span> · {status}
        {training ? ' · training fixture' : ''}
      </span>
      {status === "setup" && !training && (
        <button type="button" disabled={busy} onClick={startExercise} className="rounded border border-[var(--store-accent-border)] px-2 py-1 text-[10px] font-mono text-[var(--store-accent)]">
          Start exercise
        </button>
      )}
      {!training && (
        <button type="button" disabled={busy} onClick={advanceTurn} className="rounded border border-[var(--store-line)] px-2 py-1 text-[10px] font-mono text-white hover:border-[var(--store-accent-border)]">
          Advance turn
        </button>
      )}
      <Link href={`/pcm/exercise/${exerciseId}/aar`} className="text-[10px] font-mono text-[var(--store-accent)] hover:underline ml-auto">
        View AAR
      </Link>
      {msg && <span className="text-[10px] font-mono text-cyan w-full">{msg}</span>}
    </div>
  );
}
