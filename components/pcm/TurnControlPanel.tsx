"use client";

import { useState } from "react";
import Link from "next/link";
import { FileBarChart, Play, SkipForward } from "lucide-react";

interface TurnControlPanelProps {
  exerciseId: string;
  currentTurn: number;
  status: string;
  readOnly?: boolean;
  onTurnAdvanced?: () => void;
}

const STATUS_TONE: Record<string, string> = {
  active: "green",
  running: "green",
  setup: "blue",
  paused: "amber",
  complete: "",
  completed: "",
  unavailable: "red",
};

export function TurnControlPanel({ exerciseId, currentTurn, status, readOnly, onTurnAdvanced }: TurnControlPanelProps) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const advanceTurn = async () => {
    if (readOnly) {
      setMsg("Turn locked: published snapshot");
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
    if (readOnly) {
      setMsg("Exercise active: snapshot loaded");
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

  const turnLabel = currentTurn > 0 ? String(currentTurn) : status === "loading" ? "…" : "none";
  const tone = STATUS_TONE[status] ?? "";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[12px] store-text-muted">Turn</span>
        <span className="font-mono text-[22px] font-semibold leading-none tabular-nums text-[var(--store-ink)]">{turnLabel}</span>
      </div>
      {status !== "loading" ? <span className={`tag ${tone} capitalize`}>{status}</span> : null}
      {readOnly ? <span className="tag">Read-only snapshot</span> : null}
      <span className="hidden font-mono text-[12px] store-text-muted sm:inline">{exerciseId}</span>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {status === "setup" && !readOnly && (
          <button type="button" disabled={busy} onClick={startExercise} className="btn-glass disabled:opacity-50">
            <Play className="h-3.5 w-3.5" aria-hidden />
            Start exercise
          </button>
        )}
        {!readOnly && (
          <button type="button" disabled={busy} onClick={advanceTurn} className="btn-glass primary disabled:opacity-50">
            <SkipForward className="h-3.5 w-3.5" aria-hidden />
            Advance turn
          </button>
        )}
        <Link href={`/pcm/exercise/${exerciseId}/aar`} className="btn-glass">
          <FileBarChart className="h-3.5 w-3.5" aria-hidden />
          After action review
        </Link>
      </div>
      {msg && (
        <p role="status" className="w-full text-[12px] text-[#06B6D4]">
          {msg}
        </p>
      )}
    </div>
  );
}
