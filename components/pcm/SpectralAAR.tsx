'use client';

import { useEffect, useState } from 'react';
import type { AARDocument } from '@/lib/pcm/aar-engine';

export function SpectralAAR({ exerciseId }: { exerciseId: string }) {
  const [doc, setDoc] = useState<AARDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/spectral/aar?exercise_id=' + encodeURIComponent(exerciseId));
        if (!res.ok) throw new Error('AAR not available');
        const row = await res.json();
        setDoc(row.aar_document as AARDocument);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load AAR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [exerciseId]);

  if (loading) return <p className="text-xs font-mono text-white/60">Loading AAR…</p>;
  if (error || !doc) return <p className="text-xs font-mono text-red-400">{error ?? 'No AAR'}</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="store-panel rounded-xl border p-4 lg:col-span-1">
        <h2 className="font-mono text-sm text-[var(--store-accent)]">Grade</h2>
        <p className="font-mono text-2xl text-cyan">{doc.overall_grade}</p>
        <p className="text-[10px] store-text-muted">Accreditation: {doc.accreditation_eligible ? 'eligible' : 'not yet'}</p>
      </section>
      <section className="store-panel rounded-xl border p-4 lg:col-span-1">
        <h2 className="font-mono text-sm text-[var(--store-accent)]">Highlights</h2>
        <ul className="text-xs space-y-1">{doc.competency_highlights.map((h) => <li key={h}>• {h}</li>)}</ul>
      </section>
      <section className="store-panel rounded-xl border p-4 lg:col-span-1">
        <h2 className="font-mono text-sm text-[var(--store-accent)]">Metrics</h2>
        <p className="font-mono text-[10px]">Turns: {doc.report.total_turns}</p>
        <p className="font-mono text-[10px]">Leakers: {doc.report.leaker_count_total}</p>
        <p className="font-mono text-[10px]">Blue P(win): {(doc.report.blue_win_probability_final * 100).toFixed(0)}%</p>
      </section>
      <section className="store-panel rounded-xl border p-4 lg:col-span-3">
        <h2 className="font-mono text-sm text-[var(--store-accent)]">Debrief</h2>
        <pre className="whitespace-pre-wrap text-[10px] font-mono text-white/80">{doc.report.debrief_text}</pre>
      </section>
    </div>
  );
}
