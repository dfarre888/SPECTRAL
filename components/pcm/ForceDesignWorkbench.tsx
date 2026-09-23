'use client';

import { useState } from 'react';
import { BarChart3, Play } from 'lucide-react';
import type { ForceDesignFinding, ForceDesignReport } from '@/lib/moat/forceDesignEngine';
import { PanelSkeleton } from '@/components/ui/loading-skeleton';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import {
  FORCE_DESIGN_ARCHIVE_NOTE,
  FORCE_DESIGN_DESCRIPTION,
} from '@/lib/pcm/presentation-copy';

/** The question posed to the parallel engine. Shown before a run so the analyst knows what will be tested. */
const ANALYSIS_REQUEST = {
  id: 'fd-001',
  question: 'Is a 12-interceptor laydown sufficient against decoy-heavy saturation?',
  threat_profile: 'Adaptive OWA with high decoy ratio',
  success_criterion: '>=80% mission success across adaptive repetitions',
  runs_requested: 12,
  force_structure: [
    { label: 'Option A: 12 interceptors', composition: [{ platform_ref: 'coyote', quantity: 12 }], notes: 'Baseline' },
    { label: 'Option B: 18 interceptors', composition: [{ platform_ref: 'coyote', quantity: 18 }], notes: 'Magazine uplift' },
  ],
};

const PROVENANCE_LABEL: Record<ForceDesignReport['data_provenance'], { label: string; tone: string }> = {
  accredited_engine: { label: 'Accredited engine', tone: 'green' },
  external_accredited_sim: { label: 'External accredited sim', tone: 'green' },
  open_build_placeholder: { label: 'Open build placeholder', tone: 'amber' },
};

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function successTone(rate: number): string {
  if (rate >= 0.8) return 'text-[#4ADE80]';
  if (rate >= 0.5) return 'text-[#FBBF24]';
  return 'text-[#FF5C6E]';
}

const FINDING_COLUMNS: DataColumn<ForceDesignFinding>[] = [
  {
    key: 'option',
    header: 'Option',
    sticky: true,
    width: 240,
    className: 'primary',
    cell: (f) => f.option_label,
    sortValue: (f) => f.option_label,
  },
  { key: 'runs', header: 'Runs', align: 'right',
    headerClassName: '!text-right', width: 72, cell: (f) => f.runs, sortValue: (f) => f.runs },
  {
    key: 'success',
    header: 'Success',
    align: 'right',
    headerClassName: '!text-right',
    width: 96,
    cell: (f) => <span className={successTone(f.success_rate)}>{pct(f.success_rate)}</span>,
    sortValue: (f) => f.success_rate,
  },
  {
    key: 'marginal',
    header: 'Marginal',
    align: 'right',
    headerClassName: '!text-right',
    width: 96,
    cell: (f) => pct(f.marginal_rate),
    sortValue: (f) => f.marginal_rate,
  },
  {
    key: 'failure',
    header: 'Failure',
    align: 'right',
    headerClassName: '!text-right',
    width: 96,
    cell: (f) => pct(f.failure_rate),
    sortValue: (f) => f.failure_rate,
  },
  {
    key: 'assessment',
    header: 'Assessment',
    cell: (f) => (
      <>
        <span className="text-[var(--store-ink)]">{f.assessment}</span>
        {f.confidence_note ? <span className="meta">{f.confidence_note}</span> : null}
      </>
    ),
  },
];

export function ForceDesignWorkbench() {
  const [report, setReport] = useState<ForceDesignReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [archiveRun, setArchiveRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      let res = await fetch('/api/spectral/force-design/parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ANALYSIS_REQUEST),
      });
      if (!res.ok) {
        res = await fetch('/api/v1/training/force-design', { method: 'POST' });
        setArchiveRun(true);
      } else {
        setArchiveRun(false);
      }
      if (res.ok) {
        const data = await res.json();
        setReport(data.report as ForceDesignReport);
      } else {
        setError(`Analysis unavailable (${res.status}).`);
      }
    } catch {
      setError('Network error running the analysis.');
    } finally {
      setLoading(false);
    }
  }

  const q = report?.question;
  const provenance = report ? PROVENANCE_LABEL[report.data_provenance] : null;

  return (
    <div className="space-y-5">
      <section className="store-panel rounded-2xl" aria-labelledby="fd-title">
        <div className="flex flex-col gap-4 border-b border-[var(--store-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 id="fd-title" className="text-[15px] font-semibold text-[var(--store-ink)]">
              Parallel force-design analysis
            </h2>
            <p className="mt-1 max-w-[72ch] text-[13px] store-text-body">{FORCE_DESIGN_DESCRIPTION}</p>
          </div>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="btn-glass primary shrink-0 disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            {loading ? 'Running…' : report ? 'Run again' : 'Run analysis'}
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <PanelSkeleton rows={4} />
          ) : report ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {provenance ? <span className={`tag ${provenance.tone}`}>{provenance.label}</span> : null}
                {archiveRun ? <span className="text-[12px] store-text-muted">{FORCE_DESIGN_ARCHIVE_NOTE}</span> : null}
              </div>
              {error ? (
                <p role="alert" className="text-[13px] text-[#FF8A98]">
                  {error}
                </p>
              ) : null}

              {q ? (
                <dl className="grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-[max-content_minmax(0,1fr)]">
                  <dt className="store-text-muted">Question</dt>
                  <dd className="text-[var(--store-ink)]">{q.question}</dd>
                  <dt className="store-text-muted">Threat profile</dt>
                  <dd className="store-text-body">{q.threat_profile}</dd>
                  <dt className="store-text-muted">Success criterion</dt>
                  <dd className="font-mono text-[12.5px] store-text-body">{q.success_criterion}</dd>
                  <dt className="store-text-muted">Runs requested</dt>
                  <dd className="font-mono text-[12.5px] tabular-nums store-text-body">{q.runs_requested}</dd>
                </dl>
              ) : null}

              <DataTable
                rows={report.findings}
                columns={FINDING_COLUMNS}
                rowKey={(f) => f.option_label}
                maxHeight="420px"
                caption="Findings by force structure option"
              />

              <div className="max-w-[80ch]">
                <h3 className="text-[13px] font-semibold text-[var(--store-ink)]">Recommendation</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed store-text-body">{report.recommendation}</p>
              </div>

              {report.caveats?.length ? (
                <div className="max-w-[80ch]">
                  <h3 className="text-[13px] font-semibold text-[var(--store-ink)]">Caveats</h3>
                  <ul className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed store-text-muted">
                    {report.caveats.map((c) => (
                      <li key={c} className="flex gap-2">
                        <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--store-ink-mute)]" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-5 py-2 md:flex-row md:items-start">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--lacquer-line)] bg-white/[0.04]">
                <BarChart3 className="h-5 w-5 text-[var(--wb-blue)]" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-[var(--store-ink)]">{ANALYSIS_REQUEST.question}</p>
                <p className="mt-1 text-[13px] store-text-body">
                  Run analysis to compare {ANALYSIS_REQUEST.force_structure.length} laydowns over{' '}
                  {ANALYSIS_REQUEST.runs_requested} adaptive repetitions. Results show success, marginal and failure
                  rates per option, a recommendation and the caveats that bound it.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {ANALYSIS_REQUEST.force_structure.map((o) => (
                    <li key={o.label} className="tag">
                      {o.label}
                    </li>
                  ))}
                  <li className="tag amber">{ANALYSIS_REQUEST.threat_profile}</li>
                </ul>
                {error ? (
                  <p role="alert" className="mt-4 text-[13px] text-[#FF8A98]">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
