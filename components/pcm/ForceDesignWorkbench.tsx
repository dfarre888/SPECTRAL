'use client';

import { useState } from 'react';
import type { ForceDesignReport } from '@/lib/moat/forceDesignEngine';

const DEFAULT_QUESTION = {
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

export function ForceDesignWorkbench() {
  const [report, setReport] = useState<ForceDesignReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    try {
      const res = await fetch('/api/spectral/force-design/parallel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(DEFAULT_QUESTION) });
      if (res.ok) {
        const data = await res.json();
        setReport(data.report as ForceDesignReport);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <button type="button" onClick={runAnalysis} disabled={loading} className="rounded bg-[var(--store-accent)] px-3 py-1 text-xs font-mono text-black">{loading ? 'Running…' : 'Run parallel analysis (sequential sovereign stub)'}</button>
      {report && (
        <div className="store-panel rounded-xl border p-4 space-y-3">
          <p className="text-xs store-text-muted">{report.recommendation}</p>
          {report.findings.map((f) => (
            <div key={f.option_label} className="border-t border-white/10 pt-2">
              <p className="font-mono text-sm text-cyan">{f.option_label}</p>
              <p className="font-mono text-[10px]">Success {(f.success_rate * 100).toFixed(0)}% — {f.assessment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
