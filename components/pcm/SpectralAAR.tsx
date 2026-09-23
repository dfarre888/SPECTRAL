'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileBarChart } from 'lucide-react';
import { HubPageShell } from '@/components/hub/HubPageShell';
import { PanelSkeleton } from '@/components/ui/loading-skeleton';
import type { AARDocument } from '@/lib/pcm/aar-engine';
import { AAR_ADJUDICATED_SUBTITLE, AAR_ARCHIVE_SUBTITLE, AAR_EMPTY_DESCRIPTION, PCM_EYEBROW } from '@/lib/pcm/presentation-copy';
import { SHOWCASE_EXERCISE_ID } from '@/lib/pcm/showcase-exercise';

/** Inline colours: `.fc-inst .v` sets its own colour and outranks a utility class. */
const GRADE_TONE: Record<string, string> = {
  distinguished: '#4ADE80',
  commendable: '#4ADE80',
  developing: '#FBBF24',
  unsatisfactory: '#FF5C6E',
};

/** Engine headings arrive in capitals ("BLUE FORCE DEFENCE"); read them in sentence case. */
function sentenceCase(s: string): string {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function SpectralAAR({ exerciseId }: { exerciseId: string }) {
  const [doc, setDoc] = useState<AARDocument | null>(null);
  const [archiveSource, setArchiveSource] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/spectral/aar?exercise_id=' + encodeURIComponent(exerciseId));
        if (res.ok) {
          const row = await res.json();
          if (!cancelled) {
            setDoc(row.aar_document as AARDocument);
            setArchiveSource(
              exerciseId === SHOWCASE_EXERCISE_ID || row.player_id === 'spectral-player',
            );
          }
          return;
        }
        const archiveRes = await fetch('/api/v1/training/aar?exercise_id=' + encodeURIComponent(exerciseId));
        if (!archiveRes.ok) throw new Error('AAR not available');
        const row = await archiveRes.json();
        if (!cancelled) {
          setDoc(row.aar_document as AARDocument);
          setArchiveSource(true);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load AAR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [exerciseId]);

  // The engine repeats a teaching point when several sections raise it.
  const highlights = useMemo(
    () => Array.from(new Set(doc?.competency_highlights ?? [])),
    [doc],
  );

  return (
    <HubPageShell
      eyebrow={PCM_EYEBROW}
      title="After Action Review"
      subtitle={archiveSource ? AAR_ARCHIVE_SUBTITLE : AAR_ADJUDICATED_SUBTITLE}
      headerAction={
        <Link href={`/pcm/exercise/${exerciseId}`} className="btn-glass">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Live exercise
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading after action review">
          <PanelSkeleton rows={2} className="rounded-2xl" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <PanelSkeleton rows={4} className="rounded-2xl" />
            <PanelSkeleton rows={6} className="rounded-2xl" />
          </div>
        </div>
      ) : error || !doc ? (
        <section className="store-panel flex flex-col items-center rounded-2xl px-6 py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--lacquer-line)] bg-white/[0.04]">
            <FileBarChart className="h-5 w-5 text-[var(--wb-blue)]" aria-hidden />
          </span>
          <h2 className="store-display mt-4 text-[18px] font-semibold text-[var(--store-ink)]">AAR not yet available</h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed store-text-body">{AAR_EMPTY_DESCRIPTION}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link href={`/pcm/exercise/${exerciseId}`} className="btn-glass primary">
              Return to exercise
            </Link>
            <Link href="/pcm/scenario" className="btn-glass">
              Start new scenario
            </Link>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          <div className="fc-inst border-y border-[var(--store-line)]">
            <div>
              <p className="k">Overall grade</p>
              <p
                className="v capitalize"
                style={{ fontSize: 'clamp(22px, 2.2vw, 30px)', color: GRADE_TONE[doc.overall_grade] ?? undefined }}
              >
                {doc.overall_grade}
              </p>
              <p className="d">{doc.accreditation_eligible ? 'Eligible for accreditation' : 'Not yet eligible for accreditation'}</p>
            </div>
            <div>
              <p className="k">Blue P(win)</p>
              <p className="v blue">
                {(doc.report.blue_win_probability_final * 100).toFixed(0)}
                <small>%</small>
              </p>
              <p className="d">Final adjudicated turn</p>
            </div>
            <div>
              <p className="k">Leakers</p>
              <p className={`v ${doc.report.leaker_count_total > 0 ? 'red' : ''}`}>{doc.report.leaker_count_total}</p>
              <p className="d">Red platforms through the defence</p>
            </div>
            <div>
              <p className="k">Turns</p>
              <p className="v">{doc.report.total_turns}</p>
              <p className="d">
                {doc.report.key_decision_turns?.length
                  ? `Key decisions: turn ${doc.report.key_decision_turns.join(', ')}`
                  : `Outcome: ${doc.report.outcome}`}
              </p>
            </div>
            <div>
              <p className="k">Magazine expended</p>
              <p className="v">{doc.report.magazine_expended_total}</p>
              <p className="d">
                {doc.report.red_platforms_intercepted} intercepted of {doc.report.red_platforms_launched} launched
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
            <section className="store-panel rounded-2xl p-5" aria-labelledby="aar-highlights">
              <h2 id="aar-highlights" className="text-[15px] font-semibold text-[var(--store-ink)]">
                Competency highlights
              </h2>
              {highlights.length === 0 ? (
                <p className="mt-2 text-[13px] store-text-muted">No teaching points raised in this exercise.</p>
              ) : (
                <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed store-text-body">
                  {highlights.map((h) => (
                    <li key={h} className="flex gap-2.5">
                      <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wb-blue)]" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-5 border-t border-[var(--store-line)] pt-3 font-mono text-[11.5px] store-text-muted">
                {doc.exercise_id} · generated {new Date(doc.generated_at).toUTCString()}
              </p>
            </section>

            <section className="store-panel rounded-2xl" aria-labelledby="aar-debrief">
              <h2 id="aar-debrief" className="border-b border-[var(--store-line)] px-5 py-4 text-[15px] font-semibold text-[var(--store-ink)]">
                Debrief
              </h2>
              {doc.report.sections?.length ? (
                <ol className="divide-y divide-[var(--store-line)]">
                  {doc.report.sections.map((s) => (
                    <li key={s.heading} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
                      <h3 className="text-[13px] font-medium text-[var(--store-ink)]">{sentenceCase(s.heading)}</h3>
                      <div className="min-w-0">
                        <p className="font-mono text-[12.5px] leading-relaxed store-text-body">{s.body}</p>
                        {s.teaching_points?.length ? (
                          <div className="mt-2.5">
                            <p className="text-[11.5px] store-text-muted">Teaching points</p>
                            <ul className="mt-1 space-y-1 text-[13px] leading-relaxed text-[var(--store-ink)]">
                              {s.teaching_points.map((t) => (
                                <li key={t} className="flex gap-2.5">
                                  <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wb-blue)]" />
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <pre className="max-h-[480px] overflow-y-auto whitespace-pre-wrap p-5 font-mono text-[12.5px] leading-relaxed store-text-body">
                  {doc.report.debrief_text}
                </pre>
              )}
            </section>
          </div>
        </div>
      )}
    </HubPageShell>
  );
}
