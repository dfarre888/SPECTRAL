'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Zap } from 'lucide-react'
import {
  computeSamIntercept,
  getSamProfile,
  SAM_PROFILES,
  SAM_SYSTEM_IDS,
  type EcmLevel,
  type SamInterceptResult,
  type UasTargetCategory,
} from '@/lib/risk/sam-intercept'
import { getCellColour } from '@/lib/defeat/cell-value'
import { cn } from '@/lib/utils'
import {
  checkEnvelope,
  envelopeBandPct,
  sliderMaxFor,
} from '@/lib/risk/envelope-explain'

const TARGET_CATEGORIES: UasTargetCategory[] = [
  'fpv', 'owa', 'loitering_munition', 'tactical_isr', 'male', 'hale',
]
const ECM_LEVELS: EcmLevel[] = ['none', 'basic', 'advanced', 'military_grade']

const TARGET_LABELS: Record<string, string> = {
  fpv: 'FPV',
  owa: 'OWA',
  loitering_munition: 'Loitering munition',
  tactical_isr: 'Tactical ISR',
  male: 'MALE',
  hale: 'HALE',
}

const ECM_LABELS: Record<string, string> = {
  none: 'None',
  basic: 'Basic',
  advanced: 'Advanced',
  military_grade: 'Military grade',
}

// Same bands and meaning as the matrix (lib/defeat/cell-value getCellColour):
// a high kill probability is green, a low one red.
function pkBarColor(pk: number): string {
  const band = getCellColour(Math.round(pk * 100))
  if (band === 'green') return '#4ADE80'
  if (band === 'amber') return '#FBBF24'
  return 'var(--wb-red)'
}

interface SamInterceptPanelProps { onClose: () => void }

export function SamInterceptPanel({ onClose }: SamInterceptPanelProps) {
  const [systemId, setSystemId] = useState<string>(SAM_SYSTEM_IDS[0] ?? 'sa-15-gauntlet')
  const [target, setTarget] = useState<UasTargetCategory>('owa')
  const [slantRange, setSlantRange] = useState(8000)
  const [targetAlt, setTargetAlt] = useState(500)
  const [ecmLevel, setEcmLevel] = useState<EcmLevel>('none')
  const [salvoCount, setSalvoCount] = useState(2)
  const [result, setResult] = useState<SamInterceptResult | null>(null)

  useEffect(() => {
    setResult(
      computeSamIntercept(
        {
          system_id: systemId,
          target_category: target,
          slant_range_m: slantRange,
          target_alt_m: targetAlt,
          ecm_level: ecmLevel,
          salvo_count: salvoCount,
        },
        SAM_PROFILES,
      ),
    )
  }, [systemId, target, slantRange, targetAlt, ecmLevel, salvoCount])

  const systemOptions = useMemo(
    () => SAM_SYSTEM_IDS.map((id) => ({ id, label: getSamProfile(id)?.nato_designation ?? id })),
    [],
  )

  const profile = getSamProfile(systemId)

  // Sliders scale to the selected system. A fixed 40 km axis made every MANPADS
  // look identical and put its whole envelope in the first tenth of the travel.
  const rangeSliderMax = profile ? sliderMaxFor(profile.max_range_m) : 40_000
  const altSliderMax = profile ? sliderMaxFor(profile.max_alt_m) : 30_000

  const envelope = profile
    ? {
        minRangeM: profile.min_range_m,
        maxRangeM: profile.max_range_m,
        minAltM: profile.min_alt_m,
        maxAltM: profile.max_alt_m,
      }
    : null

  const check = envelope
    ? checkEnvelope(envelope, slantRange, targetAlt, {
        systemLabel: profile?.nato_designation,
        targetLabel: target.replace(/_/g, ' ').toUpperCase(),
      })
    : null

  const rangeBand = envelope ? envelopeBandPct(envelope.minRangeM, envelope.maxRangeM, rangeSliderMax) : null
  const altBand = envelope ? envelopeBandPct(envelope.minAltM, envelope.maxAltM, altSliderMax) : null

  // Keep the sliders inside the new scale when the system changes.
  useEffect(() => {
    setSlantRange((v) => Math.min(v, rangeSliderMax))
    setTargetAlt((v) => Math.min(v, altSliderMax))
  }, [rangeSliderMax, altSliderMax])

  return (
    <div className="glass-popover w-[340px] flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--glass-line)] pl-4 pr-2 py-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--store-ink)]">
          <Zap className="h-4 w-4 store-text-muted" aria-hidden /> SAM intercept calculator
        </div>
        <button type="button" onClick={onClose} className="glass-icon-btn" aria-label="Close SAM intercept calculator">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[12px]">
        <label className="block space-y-1.5">
          <span className="block text-[12px] store-text-muted">System</span>
          <select value={systemId} onChange={(e) => setSystemId(e.target.value)} className="glass-field w-full px-2.5 py-1.5 font-mono text-[13px]">
            {systemOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          {envelope && (
            <p className="text-[11.5px] font-mono store-text-muted tabular-nums">
              Envelope {(envelope.minRangeM / 1000).toFixed(1)}–{(envelope.maxRangeM / 1000).toFixed(1)} km ·
              {' '}{envelope.minAltM}–{envelope.maxAltM} m alt
            </p>
          )}
        </label>
        <div className="space-y-1.5">
          <span className="block text-[12px] store-text-muted">Target</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Target category">
            {TARGET_CATEGORIES.map((cat) => (
              <button key={cat} type="button" aria-pressed={target === cat} onClick={() => setTarget(cat)} className="btn-e xs">
                {TARGET_LABELS[cat] ?? cat.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="block text-[12px] store-text-muted">Slant range (m)</span>
            <div className="relative">
              {/* Shaded band marks where an engagement is actually possible. */}
              {rangeBand && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-black/40 pointer-events-none">
                  <div
                    className="absolute h-full rounded-full bg-[rgba(74,222,128,0.35)]"
                    style={{ left: `${rangeBand.leftPct}%`, width: `${rangeBand.widthPct}%` }}
                  />
                </div>
              )}
              <input type="range" min={0} max={rangeSliderMax} step={100} value={slantRange}
                onChange={(e) => setSlantRange(Number(e.target.value))}
                className="relative w-full bg-transparent" />
            </div>
            <span className={cn('font-mono text-[12px] tabular-nums', check && !check.inEnvelope ? 'text-[var(--wb-red)]' : 'text-cyan')}>
              {slantRange.toLocaleString()}
            </span>
          </label>
          <label className="space-y-1">
            <span className="block text-[12px] store-text-muted">Target altitude (m)</span>
            <div className="relative">
              {altBand && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-black/40 pointer-events-none">
                  <div
                    className="absolute h-full rounded-full bg-[rgba(74,222,128,0.35)]"
                    style={{ left: `${altBand.leftPct}%`, width: `${altBand.widthPct}%` }}
                  />
                </div>
              )}
              <input type="range" min={0} max={altSliderMax} step={50} value={targetAlt}
                onChange={(e) => setTargetAlt(Number(e.target.value))}
                className="relative w-full bg-transparent" />
            </div>
            <span className={cn('font-mono text-[12px] tabular-nums', check && !check.inEnvelope ? 'text-[var(--wb-red)]' : 'text-cyan')}>
              {targetAlt.toLocaleString()}
            </span>
          </label>
        </div>
        <p className="text-[11.5px] store-text-muted -mt-1">
          Green band: engageable. Sliders scale to the selected system.
        </p>
        <div className="space-y-1.5">
          <span className="block text-[12px] store-text-muted">Salvo</span>
          <div className="seg sm flex w-full" role="group" aria-label="Salvo size">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" aria-pressed={salvoCount === n} onClick={() => setSalvoCount(n)} className="flex-1 justify-center font-mono">
                ×{n}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="block text-[12px] store-text-muted">ECM</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="ECM level">
            {ECM_LEVELS.map((level) => (
              <button key={level} type="button" aria-pressed={ecmLevel === level} onClick={() => setEcmLevel(level)} className="btn-e xs">
                {ECM_LABELS[level] ?? level.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        {result && (
          <div className="rounded-xl border border-[var(--lacquer-line)] bg-[rgba(0,0,0,0.35)] p-3 space-y-3">
            {check && (
              <p className="text-[12px] store-text-body leading-snug">{check.statement}</p>
            )}
            <span className={cn('tag', result.in_envelope ? 'green' : 'red')}>
              {result.in_envelope ? 'In envelope' : 'Out of engagement envelope'}
            </span>
            {/* A calculator that says no must say why, and where yes begins. */}
            {check && !check.inEnvelope && (
              <div className="space-y-1.5">
                {check.failures.map((f) => (
                  <div key={f.axis} className="rounded-lg border border-[rgba(255,92,110,0.3)] px-2.5 py-2">
                    <p className="text-[12px] text-[#FF8A98] leading-snug">{f.message}</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (f.axis.startsWith('range')) setSlantRange(f.suggestM)
                        else setTargetAlt(f.suggestM)
                      }}
                      className="mt-1 text-[12px] text-[var(--wb-blue)] hover:underline"
                    >
                      Snap to <span className="font-mono tabular-nums">{f.suggestM.toLocaleString()}</span> m
                    </button>
                  </div>
                ))}
              </div>
            )}
            {result.in_envelope && (
              <>
                <PkRow label="Pk single" value={result.pk_single} />
                <PkRow label={`Pk salvo (×${result.salvo_count})`} value={result.pk_salvo} />
                <div className="text-[11.5px] font-mono store-text-muted space-y-1 border-t border-[var(--store-line)] pt-2 tabular-nums">
                  <p>Range factor {result.range_factor.toFixed(2)}</p>
                  <p>Altitude factor {result.altitude_factor.toFixed(2)}</p>
                  <p>ECM factor {result.ecm_factor.toFixed(2)}</p>
                </div>
                {result.engagement_notes.length > 0 && (
                  <ul className="text-[12px] store-text-body list-disc pl-4 space-y-0.5">{result.engagement_notes.map((n) => <li key={n}>{n}</li>)}</ul>
                )}
                {result.recommended_response && <p className="text-[12px] store-text-body">{result.recommended_response}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PkRow({ label, value }: { label: string; value: number }) {
  const color = pkBarColor(value)
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[12px] store-text-muted"><span>{label}</span><span className="font-mono text-xl tabular-nums" style={{ color }}>{value.toFixed(2)}</span></div>
      <div className="h-1.5 rounded-full bg-black/40"><div className="h-full rounded-full" style={{ width: `${Math.min(100,value*100)}%`, background: color }} /></div>
    </div>
  )
}
