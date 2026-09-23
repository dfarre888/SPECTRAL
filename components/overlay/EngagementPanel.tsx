'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  SAM_MATRIX_PLATFORMS,
  platformToUasCategory,
} from '@/lib/defeat/sam-matrix-bridge'
import {
  computeEngagement,
  type EngagementResult,
  type EngagementScenario,
} from '@/lib/overlay/engagement-calc'
import { SAM_RING_STYLES } from '@/lib/overlay/overlay-map-entities'
import {
  SAM_SYSTEM_IDS,
  getSamProfile,
  type EcmLevel,
  type UasTargetCategory,
} from '@/lib/risk/sam-intercept'
import type { OverlayPlacementMode } from '@/components/overlay/OverlayGeometryMap'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

const ECM_LEVELS: { id: EcmLevel; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'basic', label: 'Basic' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'military_grade', label: 'Military' },
]

const TARGET_CATEGORIES: { id: UasTargetCategory; label: string }[] = [
  { id: 'fpv', label: 'FPV' },
  { id: 'owa', label: 'One-way attack (OWA)' },
  { id: 'loitering_munition', label: 'Loitering munition' },
  { id: 'tactical_isr', label: 'Tactical ISR' },
  { id: 'male', label: 'MALE' },
  { id: 'hale', label: 'HALE' },
]

const SALVO_SIZES = [1, 2, 3, 4]

/** Engagement phase: label and a status tag. Escalates blue, amber, red; green once resolved. */
export const PHASE_META: Record<EngagementResult['phase'], { label: string; tag: string }> = {
  outside_detect: { label: 'Outside detection', tag: 'tag' },
  detect: { label: 'Detect', tag: 'tag blue' },
  track: { label: 'Track', tag: 'tag amber' },
  launch: { label: 'Launch', tag: 'tag red' },
  intercept: { label: 'Intercept', tag: 'tag red' },
  post_intercept: { label: 'Post-intercept', tag: 'tag green' },
}

interface EngagementPanelProps {
  platforms: Platform[]
  scenario?: EngagementScenario
  onScenarioChange?: (scenario: EngagementScenario) => void
  placementMode?: OverlayPlacementMode
  onStartPlacement?: (mode: OverlayPlacementMode) => void
}

export function defaultEngagementScenario(platforms: Platform[]): EngagementScenario {
  const matrixPlatforms = platforms.filter((p) =>
    (SAM_MATRIX_PLATFORMS as readonly string[]).includes(p.id),
  )
  const platform = matrixPlatforms.find((p) => p.id === 'shahed-136') ?? matrixPlatforms[0]
  const cat = platform ? platformToUasCategory(platform.id) ?? 'owa' : 'owa'
  return {
    system_id: 'sa-15-gauntlet',
    platform_id: platform?.id ?? 'shahed-136',
    target_cat: cat,
    uas_lon: 36.25,
    uas_lat: 49.95,
    uas_alt_m: 500,
    sam_lon: 36.2,
    sam_lat: 49.9,
    sam_alt_m: 100,
    ecm_level: 'none',
    salvo_count: 2,
  }
}

const fieldClass = 'glass-field h-9 w-full px-3 text-[13px] font-mono'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="space-y-3 border-t border-[var(--store-line)] pt-5">
      <h3 className="text-[13px] font-semibold text-[var(--store-ink)]">{title}</h3>
      {children}
    </div>
  )
}

function FieldLabel({ children, value }: { children: ReactNode; value?: ReactNode }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
      <span className="store-text-muted">{children}</span>
      {value != null ? <span className="font-mono tabular-nums text-[var(--store-ink)]">{value}</span> : null}
    </span>
  )
}

export function EngagementPanel({
  platforms,
  scenario: controlledScenario,
  onScenarioChange,
  placementMode: _placementMode,
  onStartPlacement: _onStartPlacement,
}: EngagementPanelProps) {
  const matrixPlatforms = useMemo(
    () => platforms.filter((p) => (SAM_MATRIX_PLATFORMS as readonly string[]).includes(p.id)),
    [platforms],
  )
  const [internalScenario, setInternalScenario] = useState<EngagementScenario>(() =>
    defaultEngagementScenario(matrixPlatforms),
  )

  const scenario = controlledScenario ?? internalScenario

  const result = useMemo(() => computeEngagement(scenario), [scenario])

  const update = (patch: Partial<EngagementScenario>) => {
    const next = { ...scenario, ...patch }
    if (controlledScenario !== undefined) {
      onScenarioChange?.(next)
    } else {
      setInternalScenario(next)
    }
  }

  const latOffset = scenario.uas_lat - scenario.sam_lat

  return (
    <div className="w-full space-y-5 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="store-display text-[15px] font-semibold text-[var(--store-ink)]">Engagement analysis</h2>
        <span className="text-xs store-text-muted">Updates live</span>
      </div>

      {/* The phase readout floats on the globe; here the panel leads with Pk. */}
      <EngagementHeadline result={result} showPhase={false} />

      <Group title="Scenario">
        <label className="block">
          <FieldLabel>SAM system</FieldLabel>
          <select
            value={scenario.system_id}
            onChange={(e) => update({ system_id: e.target.value })}
            className={fieldClass}
          >
            {SAM_SYSTEM_IDS.map((id) => (
              <option key={id} value={id}>{getSamProfile(id)?.nato_designation ?? id}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <FieldLabel>UAS platform</FieldLabel>
          <select
            value={scenario.platform_id}
            onChange={(e) => {
              const id = e.target.value
              const cat = platformToUasCategory(id) ?? scenario.target_cat
              update({ platform_id: id, target_cat: cat })
            }}
            className={fieldClass}
          >
            {matrixPlatforms.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <FieldLabel>Target category</FieldLabel>
          <select
            value={scenario.target_cat}
            onChange={(e) => update({ target_cat: e.target.value as UasTargetCategory })}
            className={fieldClass}
          >
            {TARGET_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
      </Group>

      <Group title="Geometry">
        <label className="block">
          <FieldLabel value={`${scenario.uas_alt_m.toLocaleString()} m`}>UAS altitude</FieldLabel>
          <input
            type="range" min={50} max={20000} step={50} value={scenario.uas_alt_m}
            onChange={(e) => update({ uas_alt_m: Number(e.target.value) })}
            className="w-full accent-[var(--wb-blue)]"
          />
        </label>
        <label className="block">
          <FieldLabel value={`${latOffset >= 0 ? '+' : ''}${latOffset.toFixed(3)}° lat`}>Ground range offset</FieldLabel>
          <input
            type="range" min={-0.2} max={0.2} step={0.005} value={latOffset}
            onChange={(e) => update({ uas_lat: scenario.sam_lat + Number(e.target.value) })}
            className="w-full accent-[var(--wb-blue)]"
          />
        </label>
        <p className="text-xs store-text-muted">
          Computed slant range{' '}
          <span className="font-mono tabular-nums text-cyan">{Math.round(result.slant_range_m).toLocaleString()} m</span>
        </p>
      </Group>

      <Group title="Countermeasures and salvo">
        <div>
          <FieldLabel>Target ECM</FieldLabel>
          <div className="seg sm flex w-full" role="group" aria-label="Target ECM level">
            {ECM_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                aria-pressed={scenario.ecm_level === level.id}
                onClick={() => update({ ecm_level: level.id })}
                className="flex-1 justify-center"
                title={level.id === 'military_grade' ? 'Military grade' : undefined}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Missiles per salvo</FieldLabel>
          <div className="seg sm flex w-full" role="group" aria-label="Missiles per salvo">
            {SALVO_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={scenario.salvo_count === n}
                onClick={() => update({ salvo_count: n })}
                className="flex-1 justify-center font-mono"
              >
                ×{n}
              </button>
            ))}
          </div>
        </div>
      </Group>

      <EngagementDetails result={result} />
    </div>
  )
}

function Row({ k, v, swatch }: { k: ReactNode; v: ReactNode; swatch?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="flex items-center gap-2 text-[13px] store-text-body">
        {swatch ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: swatch }} aria-hidden /> : null}
        {k}
      </dt>
      <dd className="font-mono text-[13px] tabular-nums text-[var(--store-ink)]">{v}</dd>
    </div>
  )
}

/** Phase and the two Pk numbers: the answer, shown above the inputs. */
export function EngagementHeadline({ result, showPhase = true }: { result: EngagementResult; showPhase?: boolean }) {
  const intercept = result.intercept
  const phase = PHASE_META[result.phase]
  return (
    <section className="space-y-3" aria-label="Engagement result">
      {showPhase ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs store-text-muted">Phase</span>
          <span className={cn(phase.tag, 'font-mono')} role="status">{phase.label}</span>
        </div>
      ) : null}
      {intercept && intercept.in_envelope ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl store-panel-inner px-3.5 py-3">
            <p className="text-xs store-text-muted">Pk single shot</p>
            <p className="mt-1.5 font-mono text-[30px] leading-none tabular-nums text-[var(--store-ink)]">
              {intercept.pk_single.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl store-panel-inner px-3.5 py-3">
            <p className="text-xs store-text-muted">Pk salvo ×{intercept.salvo_count}</p>
            <p className="mt-1.5 font-mono text-[30px] leading-none tabular-nums text-[var(--wb-blue)]">
              {intercept.pk_salvo.toFixed(2)}
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl store-panel-inner px-3.5 py-3 text-[13px] store-text-body">
          Target is outside the engagement envelope. No Pk at this geometry.
        </p>
      )}
    </section>
  )
}

/** Geometry, envelope ranges, Pk factors and model notes. */
export function EngagementDetails({ result }: { result: EngagementResult }) {
  const intercept = result.intercept
  const m = (v: number) => `${Math.round(v).toLocaleString()} m`
  return (
    <section className="space-y-4 border-t border-[var(--store-line)] pt-5" aria-label="Engagement detail">
      <h3 className="text-[13px] font-semibold text-[var(--store-ink)]">Detail</h3>
      <dl className="divide-y divide-[var(--store-line)]">
        <Row k="Slant range" v={m(result.slant_range_m)} />
        <Row k="Time of flight" v={`${result.time_of_flight_s.toFixed(1)} s`} />
        <Row k="Bearing" v={`${((result.bearing_deg + 360) % 360).toFixed(0)}°`} />
      </dl>

      <div>
        <p className="mb-1 text-xs store-text-muted">Envelope</p>
        <dl className="divide-y divide-[var(--store-line)]">
          {SAM_RING_STYLES.map((r) => (
            <Row key={r.key} k={r.label} v={m(result[r.key])} swatch={r.fill} />
          ))}
        </dl>
      </div>

      {intercept && intercept.in_envelope ? (
        <div>
          <p className="mb-1 text-xs store-text-muted">Pk factors</p>
          <dl className="divide-y divide-[var(--store-line)]">
            <Row k="Range" v={`×${intercept.range_factor.toFixed(2)}`} />
            <Row k="Altitude" v={`×${intercept.altitude_factor.toFixed(2)}`} />
            <Row k="ECM" v={`×${intercept.ecm_factor.toFixed(2)}`} />
          </dl>
        </div>
      ) : null}

      {intercept?.engagement_notes?.length ? (
        <ul className="space-y-1.5 border-t border-[var(--store-line)] pt-4">
          {intercept.engagement_notes.slice(0, 3).map((n) => (
            <li key={n} className="flex gap-2 text-xs leading-relaxed store-text-body">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--store-ink-mute)]" aria-hidden />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

/** Full result: headline plus detail. */
export function EngagementResultView({ result }: { result: EngagementResult }) {
  return (
    <div className="space-y-5">
      <EngagementHeadline result={result} />
      <EngagementDetails result={result} />
    </div>
  )
}
