'use client';

import { useState } from 'react';
import type { ForceDesignReport } from '@/lib/moat/forceDesignEngine';
import { OpsPanel } from '@/components/ui/ops-panel';
import { PanelSkeleton } from '@/components/ui/loading-skeleton';

export function ForceDesignWorkbench() {
  const [report, setReport] = useState<ForceDesignReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    try {
      let res = await fetch('/api/spectral/force-design/parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'fd-001',
          question: 'Is a 12-interceptor laydown sufficient against decoy-heavy saturation?',
          threat_profile: 'Adaptive OWA with high decoy ratio',
          success_criterion: '>=80% mission success across adaptive repetitions',
          runs_requested: 12,
          force_structure: [
            { label: 'Option A: 12 interceptors', composition: [{ platform_ref: 'coyote', quantity: 12 }], notes: 'Baseline' },
            { label: 'Option B: 18 interceptors', composition: [{ platform_ref: 'coyote', quantity: 18 }], notes: 'Magazine uplift' },
          ],
        }),
      });
      if (!res.ok) {
        res = await fetch('/api/v1/training/force-design', { method: 'POST' });
        setTraining(true);
      }
      if (res.ok) {
        const data = await res.json();
        setReport(data.report as ForceDesignReport);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <OpsPanel
        title="Parallel force-design analysis"
        kicker="Procurement decision support"
        description="Structures accredited run outcomes into a capability-manager brief. Open build uses OSINT placeholder runs when DS auth unavailable."
        actions={
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="store-btn-primary px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run analysis'}
          </button>
        }
      >
        {loading ? <PanelSkeleton rows={4} /> : null}
        {report && !loading ? (
          <div className="space-y-4">
            {training ? (
              <p className="text-[10px] font-mono text-[var(--store-accent)]">
                Training fixture — placeholder statistics for instructor demo
              </p>
            ) : null}
            <p className="text-xs store-text-body leading-relaxed">{report.recommendation}</p>
            {report.findings.map((f) => (
              <div key={f.option_label} className="border-t border-[var(--store-line)] pt-3">
                <p className="font-mono text-sm text-cyan">{f.option_label}</p>
                <p className="font-mono text-[10px] tabular-nums store-text-body mt-1">
                  Success {(f.success_rate * 100).toFixed(0)}% · marginal {(f.marginal_rate * 100).toFixed(0)}% — {f.assessment}
                </p>
              </div>
            ))}
          </div>
        ) : !loading ? (
          <p className="text-xs font-mono store-text-muted">Run analysis to generate procurement brief.</p>
        ) : null}
      </OpsPanel>
    </div>
  );
}
