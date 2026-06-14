'use client'

import { Badge } from '@/components/ui/badge'
import { StorePanel } from '@/components/ui/store-surface'
import {
  BAND_REFERENCE,
  FAILURE_FAMILY_REFERENCE,
  FAILURE_MODE_REFERENCE,
} from '@/lib/gnss/types'
import type { GnssIncident, GradedClaim } from '@/lib/gnss/types'
import { EVIDENCE_GRADE_LABEL, evidenceGradeVariant, formatFailureFamily } from '@/lib/gnss/display'

interface GnssIncidentDetailProps {
  incident: GnssIncident
}

function GradedClaimBlock<T extends string | string[] | boolean>({
  label,
  claim,
  formatValue,
}: {
  label: string
  claim: GradedClaim<T>
  formatValue?: (v: T) => string
}) {
  const display =
    formatValue?.(claim.value) ??
    (Array.isArray(claim.value)
      ? claim.value.length
        ? claim.value.join(', ')
        : '—'
      : String(claim.value))

  return (
    <div className="store-panel-inner rounded-xl p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold store-text-muted uppercase tracking-wider">{label}</p>
        <Badge variant={evidenceGradeVariant(claim.grade)}>{EVIDENCE_GRADE_LABEL[claim.grade]}</Badge>
      </div>
      <p className="text-sm text-white font-mono">{display}</p>
      <p className="text-[11px] store-text-body leading-relaxed">{claim.basis}</p>
      {claim.source_ref && (
        <p className="text-[10px] font-mono text-cyan">Source: {claim.source_ref}</p>
      )}
    </div>
  )
}

export function GnssIncidentDetail({ incident }: GnssIncidentDetailProps) {
  const familyRef = FAILURE_FAMILY_REFERENCE[incident.failure_family_primary]

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <p className="text-[10px] font-mono store-text-muted">UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY</p>
        <h2 className="text-lg font-semibold text-white mt-1">{incident.title}</h2>
        <p className="text-xs font-mono text-cyan mt-1">
          {incident.date} · {incident.environment.location_name}, {incident.environment.country}
        </p>
        <p className="text-[11px] store-text-muted mt-1">{incident.event_context}</p>
      </div>

      <StorePanel className="p-3">
        <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">Categorisation</h3>
        <p className="text-sm text-white">
          Primary: <span className="font-mono text-[var(--store-accent)]">{familyRef.label}</span>
        </p>
        {incident.failure_family_contributing.length > 0 && (
          <p className="text-[11px] store-text-body mt-1">
            Contributing:{' '}
            {incident.failure_family_contributing
              .map((f) => FAILURE_FAMILY_REFERENCE[f].label)
              .join(' · ')}
          </p>
        )}
        <p className="text-[11px] store-text-muted mt-2">{familyRef.description}</p>
      </StorePanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StorePanel className="p-3">
          <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">Platform</h3>
          <p className="text-sm text-white">{incident.platform.drone_type}</p>
          <p className="text-[11px] font-mono store-text-muted mt-1">
            {formatFailureFamily(incident.platform.category)}
            {incident.platform.swarm_size != null ? ` · ${incident.platform.swarm_size} airframes` : ''}
          </p>
          <p className="text-[10px] store-text-body mt-2">
            Resilience: {incident.platform.positioning_resilience.map(formatFailureFamily).join(', ')}
          </p>
        </StorePanel>
        <StorePanel className="p-3">
          <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">Outcome</h3>
          <p className="text-sm font-mono text-white">
            {incident.outcome.drones_affected ?? '—'} drones ·{' '}
            {incident.outcome.injuries} injuries · {incident.outcome.fatalities} fatalities
          </p>
          <p className="text-[11px] store-text-body mt-2">{incident.outcome.description}</p>
        </StorePanel>
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold store-text-muted uppercase">Graded causal claims</h3>
        <GradedClaimBlock
          label="Failure mode"
          claim={incident.failure_mode}
          formatValue={(v) => FAILURE_MODE_REFERENCE[v].label}
        />
        <GradedClaimBlock
          label="Affected bands"
          claim={incident.affected_bands}
          formatValue={(bands) =>
            bands.length
              ? bands.map((b) => BAND_REFERENCE[b]?.label ?? b).join(' · ')
              : 'None confirmed affected'
          }
        />
        <GradedClaimBlock label="Interference source" claim={incident.interference_source} />
      </div>

      {incident.spectrum.dependencies.length > 0 && (
        <StorePanel className="p-3">
          <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">
            Spectrum dependencies (defensive)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="store-text-muted text-left border-b border-[var(--store-line)]">
                  <th className="py-1.5 pr-2">Band</th>
                  <th className="py-1.5 pr-2">Role</th>
                  <th className="py-1.5 pr-2">Interference</th>
                  <th className="py-1.5">Grade</th>
                </tr>
              </thead>
              <tbody>
                {incident.spectrum.dependencies.map((dep, i) => (
                  <tr key={i} className="border-b border-[var(--store-line)]/50">
                    <td className="py-2 pr-2 font-mono text-cyan">
                      {BAND_REFERENCE[dep.band]?.label ?? dep.band}
                    </td>
                    <td className="py-2 pr-2 store-text-body">{dep.role.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-2 text-white">
                      {dep.interference_on_band.value ? 'Yes' : 'No'}
                    </td>
                    <td className="py-2">
                      <Badge variant={evidenceGradeVariant(dep.interference_on_band.grade)}>
                        {EVIDENCE_GRADE_LABEL[dep.interference_on_band.grade]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {incident.spectrum.spectrum_survey_conducted != null && (
            <p className="text-[11px] store-text-body mt-3">
              Pre-flight spectrum survey:{' '}
              <span className="font-mono text-white">
                {incident.spectrum.spectrum_survey_conducted ? 'Yes' : 'No'}
              </span>
              {incident.spectrum.survey_finding && (
                <span className="block mt-1">{incident.spectrum.survey_finding}</span>
              )}
            </p>
          )}
        </StorePanel>
      )}

      {(incident.mitigation_that_helped || incident.mitigation_that_would_have_helped) && (
        <StorePanel className="p-3 space-y-2">
          {incident.mitigation_that_helped && (
            <div>
              <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-1">Helped</h3>
              <p className="text-[11px] store-text-body">{incident.mitigation_that_helped}</p>
            </div>
          )}
          {incident.mitigation_that_would_have_helped && (
            <div>
              <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-1">
                Would have helped
              </h3>
              <p className="text-[11px] store-text-body">{incident.mitigation_that_would_have_helped}</p>
            </div>
          )}
        </StorePanel>
      )}

      <StorePanel className="p-3">
        <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">Sources</h3>
        <ul className="space-y-2">
          {incident.sources.map((s, i) => (
            <li key={i} className="text-[11px] store-text-body">
              <span className="font-mono text-white">{s.type}</span> · {s.title}
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-cyan hover:underline mt-0.5 truncate"
                >
                  {s.url}
                </a>
              )}
            </li>
          ))}
        </ul>
      </StorePanel>

      <StorePanel className="p-3 border-[var(--store-accent-border)]">
        <h3 className="text-[10px] font-semibold store-text-muted uppercase mb-2">Analyst notes</h3>
        <p className="text-[11px] store-text-body leading-relaxed">{incident.analyst_notes}</p>
      </StorePanel>
    </div>
  )
}
