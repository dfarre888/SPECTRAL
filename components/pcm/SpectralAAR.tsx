'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HubPageShell } from '@/components/hub/HubPageShell';
import { EmptyState } from '@/components/ui/empty-state';
import { GlobeSkeleton, PanelSkeleton } from '@/components/ui/loading-skeleton';
import { OpsPanel } from '@/components/ui/ops-panel';
import type { AARDocument } from '@/lib/pcm/aar-engine';
import { FileBarChart } from 'lucide-react';

export function SpectralAAR({ exerciseId }: { exerciseId: string }) {
  const [doc, setDoc] = useState<AARDocument | null>(null);
  const [training, setTraining] = useState(false);
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
          setDoc(row.aar_document as AARDocument);
          setTraining(Boolean(row.training));
          return;
        }
        const trainingRes = await fetch('/api/v1/training/aar?exercise_id=' + encodeURIComponent(exerciseId));
        if (!trainingRes.ok) throw new Error('AAR not available');
        const row = await trainingRes.json();
        if (!cancelled) {
          setDoc(row.aar_document as AARDocument);
          setTraining(true);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load AAR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [exerciseId]);

  return (
    <HubPageShell
      eyebrow="PCM Training"
      title="After Action Review"
      subtitle={
        training
          ? 'OSINT training fixture — illustrative debrief for instructor walkthrough.'
          : 'Persisted exercise debrief from adjudicated turn history.'
      }
      headerAction={
        <Link href={`/pcm/exercise/${exerciseId}`} className="text-xs font-mono text-cyan hover:opacity-80">
          ← Live exercise
        </Link>
      }
    >
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <PanelSkeleton className="lg:col-span-1" />
          <PanelSkeleton className="lg:col-span-1" />
          <PanelSkeleton className="lg:col-span-1" />
          <GlobeSkeleton className="lg:col-span-3 min-h-[200px]" />
        </div>
      ) : error || !doc ? (
        <EmptyState
          icon={FileBarChart}
          title="AAR not yet available"
          description="Complete at least one exercise turn, or use the training fixture for demo walkthrough."
          primaryAction={{ href: `/pcm/exercise/${exerciseId}`, label: 'Return to exercise' }}
          secondaryAction={{ href: '/pcm/scenario', label: 'Start new scenario →' }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <OpsPanel title="Grade" kicker="Overall">
            <p className="font-mono text-2xl text-cyan capitalize">{doc.overall_grade}</p>
            <p className="text-[10px] font-mono store-text-muted mt-2">
              Accreditation: {doc.accreditation_eligible ? 'eligible' : 'not yet'}
            </p>
          </OpsPanel>
          <OpsPanel title="Highlights" kicker="Competency">
            <ul className="text-xs store-text-body space-y-1">
              {doc.competency_highlights.map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
          </OpsPanel>
          <OpsPanel title="Metrics" kicker="Engagement">
            <SpecGrid doc={doc} />
          </OpsPanel>
          <OpsPanel title="Debrief narrative" kicker="Instructor" className="lg:col-span-3" bodyClassName="p-0">
            <pre className="whitespace-pre-wrap text-[10px] font-mono store-text-body p-4 max-h-96 overflow-y-auto">
              {doc.report.debrief_text}
            </pre>
          </OpsPanel>
        </div>
      )}
    </HubPageShell>
  );
}

function SpecGrid({ doc }: { doc: AARDocument }) {
  return (
    <div className="space-y-1 font-mono text-[10px] tabular-nums">
      <p>Turns: {doc.report.total_turns}</p>
      <p>Leakers: {doc.report.leaker_count_total}</p>
      <p>Blue P(win): {(doc.report.blue_win_probability_final * 100).toFixed(0)}%</p>
    </div>
  );
}
