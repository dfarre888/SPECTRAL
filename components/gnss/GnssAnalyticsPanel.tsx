'use client'

import { StorePanel } from '@/components/ui/store-surface'
import { GnssTaxonomyReference } from '@/components/gnss/GnssTaxonomyReference'
import type { AnalyticsSummary } from '@/lib/gnss/types'

interface GnssAnalyticsPanelProps {
  analytics: AnalyticsSummary
}

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="store-panel-inner rounded-xl px-3 py-2">
      <p className="text-[10px] store-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-lg font-mono text-white mt-0.5">{value}</p>
      {sub && <p className="text-[9px] store-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

export function GnssAnalyticsPanel({ analytics }: GnssAnalyticsPanelProps) {
  return (
    <StorePanel className="p-4 lg:col-span-1 flex flex-col gap-4 min-h-[420px]">
      <div>
        <h2 className="text-xs store-text-muted uppercase tracking-wider font-semibold">
          Analytics
        </h2>
        <p className="text-[10px] store-text-muted mt-0.5">
          Headlines use evidenced counts only — inferred shown separately
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatBlock label="Incidents" value={analytics.total_incidents} />
        <StatBlock
          label="Confirmed cause"
          value={`${analytics.confirmed_cause_pct}%`}
          sub="failure_mode grade = confirmed"
        />
        <StatBlock label="Injuries" value={analytics.total_injuries} />
        <StatBlock label="Fatalities" value={analytics.total_fatalities} />
      </div>

      <div>
        <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">
          Failure families
        </h3>
        <ul className="space-y-1 text-[11px]">
          {analytics.family_analysis.slice(0, 5).map((f) => (
            <li
              key={f.family}
              className="flex justify-between store-panel-inner rounded-lg px-2 py-1.5"
            >
              <span className="font-mono text-white">{f.family.replace(/_/g, ' ')}</span>
              <span className="font-mono text-cyan">
                {f.primary}p / {f.contributing}c
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">
          Band mentions (by grade)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="store-text-muted text-left">
                <th className="pb-1">Band</th>
                <th className="pb-1 text-right">Conf</th>
                <th className="pb-1 text-right">Rep</th>
                <th className="pb-1 text-right">Est</th>
              </tr>
            </thead>
            <tbody>
              {analytics.band_analysis.slice(0, 4).map((b) => (
                <tr key={b.band} className="border-t border-[var(--store-line)]/40">
                  <td className="py-1 font-mono text-cyan">{b.label}</td>
                  <td className="py-1 text-right text-white">{b.confirmed_count}</td>
                  <td className="py-1 text-right text-white">{b.reported_count}</td>
                  <td className="py-1 text-right store-text-muted">{b.inferred_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">
          Spectrum surveys
        </h3>
        <p className="text-[11px] font-mono text-white">
          {analytics.spectrum_analysis.surveys_run} run ·{' '}
          {analytics.spectrum_analysis.surveys_that_correctly_cleared} correctly cleared non-RF
        </p>
      </div>

      <div>
        <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">Key findings</h3>
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {analytics.key_findings.map((f, i) => (
            <li key={i} className="text-[10px] store-text-body leading-relaxed store-panel-inner rounded-lg p-2">
              {f}
            </li>
          ))}
        </ul>
      </div>

      <GnssTaxonomyReference />
    </StorePanel>
  )
}
