'use client'

import { useMemo, useState } from 'react'
import {
  SAM_MATRIX_PLATFORMS,
  platformToUasCategory,
} from '@/lib/defeat/sam-matrix-bridge'
import {
  computeEngagement,
  type EngagementResult,
  type EngagementScenario,
} from '@/lib/overlay/engagement-calc'
import {
  SAM_SYSTEM_IDS,
  getSamProfile,
  type EcmLevel,
  type UasTargetCategory,
} from '@/lib/risk/sam-intercept'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

const ECM_LEVELS: EcmLevel[] = ['none', 'basic', 'advanced', 'military_grade']

const PHASE_STYLE: Record<EngagementResult['phase'], string> = {
  outside_detect: 'bg-gray-700 text-gray-200',
  detect: 'bg-blue-900 text-blue-100',
  track: 'bg-amber-900 text-amber-100',
  launch: 'bg-orange-900 text-orange-100',
  intercept: 'bg-red-900 text-red-100',
  post_intercept: 'bg-green-900 text-green-100',
}

interface EngagementPanelProps {
  platforms: Platform[]
}

function defaultScenario(platforms: Platform[]): EngagementScenario {
  const platform = platforms.find((p) => p.id === 'shahed-136') ?? platforms[0]
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

export function EngagementPanel({ platforms }: EngagementPanelProps) {
  const matrixPlatforms = useMemo(
    () => platforms.filter((p) => (SAM_MATRIX_PLATFORMS as readonly string[]).includes(p.id)),
    [platforms],
  )
  const [scenario, setScenario] = useState<EngagementScenario>(() => defaultScenario(matrixPlatforms))

  const result = useMemo(() => computeEngagement(scenario), [scenario])

  const update = (patch: Partial<EngagementScenario>) => setScenario((s) => ({ ...s, ...patch }))

  return (
    <div className="w-full max-w-[420px] space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-160px)]">
      <h2 className="text-sm font-semibold text-[#F97316] uppercase tracking-wide">Engagement analysis</h2>
      <label className="block space-y-1 text-xs">
        <span className="text-slate-400">SAM system</span>
        <select
          value={scenario.system_id}
          onChange={(e) => update({ system_id: e.target.value })}
          className="w-full rounded border border-white/10 bg-[#111118] px-2 py-1.5 font-mono text-[11px] text-white"
        >
          {SAM_SYSTEM_IDS.map((id) => (
            <option key={id} value={id}>{getSamProfile(id)?.nato_designation ?? id}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-xs">
        <span className="text-slate-400">UAS platform</span>
        <select
          value={scenario.platform_id}
          onChange={(e) => {
            const id = e.target.value
            const cat = platformToUasCategory(id) ?? scenario.target_cat
            update({ platform_id: id, target_cat: cat })
          }}
          className="w-full rounded border border-white/10 bg-[#111118] px-2 py-1.5 font-mono text-[11px] text-white"
        >
          {matrixPlatforms.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-xs">
        <span className="text-slate-400">Target category</span>
        <select
          value={scenario.target_cat}
          onChange={(e) => update({ target_cat: e.target.value as UasTargetCategory })}
          className="w-full rounded border border-white/10 bg-[#111118] px-2 py-1.5 font-mono text-[11px] text-white"
        >
          {(['fpv','owa','loitering_munition','tactical_isr','male','hale'] as UasTargetCategory[]).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-xs">
        <span className="text-slate-400">Slant range proxy — UAS alt (m)</span>
        <input type="range" min={50} max={20000} step={50} value={scenario.uas_alt_m} onChange={(e) => update({ uas_alt_m: Number(e.target.value) })} className="w-full" />
        <span className="font-mono text-cyan">{scenario.uas_alt_m} m · computed slant {Math.round(result.slant_range_m).toLocaleString()} m</span>
      </label>
      <label className="block space-y-1 text-xs">
        <span className="text-slate-400">Ground range (lat offset)</span>
        <input type="range" min={-0.2} max={0.2} step={0.005} value={scenario.uas_lat - scenario.sam_lat} onChange={(e) => update({ uas_lat: scenario.sam_lat + Number(e.target.value) })} className="w-full" />
      </label>
      <div className="flex flex-wrap gap-1">{ECM_LEVELS.map((level) => (
        <button key={level} type="button" onClick={() => update({ ecm_level: level })} className={cn('rounded px-2 py-1 text-[10px] font-mono border', scenario.ecm_level===level ? 'bg-[#F97316] text-white border-[#F97316]' : 'border-white/10 text-slate-400')}>{level}</button>
      ))}</div>
      <div className="flex gap-1">{[1,2,3,4].map((n) => (
        <button key={n} type="button" onClick={() => update({ salvo_count: n })} className={cn('flex-1 rounded border py-1 font-mono text-[11px]', scenario.salvo_count===n ? 'border-orange bg-orange/20' : 'border-white/10 text-slate-400')}>Salvo ×{n}</button>
      ))}</div>
      <EngagementResultView result={result} />
    </div>
  )
}

export function EngagementResultView({ result }: { result: EngagementResult }) {
  const intercept = result.intercept
  return (
    <div className="rounded-xl border border-white/10 bg-[#111118] p-3 space-y-3 text-xs font-mono">
      <div className={cn('text-center uppercase text-[10px] font-semibold py-2 rounded', PHASE_STYLE[result.phase])}>
        {result.phase.replace(/_/g, ' ')}
      </div>
      <div className="grid grid-cols-2 gap-2 text-slate-300">
        <p>Slant range</p><p className="text-white">{Math.round(result.slant_range_m).toLocaleString()} m</p>
        <p>Time of flight</p><p className="text-white">{result.time_of_flight_s.toFixed(1)} s</p>
        <p>Bearing</p><p className="text-white">{((result.bearing_deg + 360) % 360).toFixed(0)}°</p>
      </div>
      {intercept && intercept.in_envelope && (
        <div className="border-t border-white/5 pt-2 space-y-1">
          <p>Pk single <span className="text-white text-lg">{intercept.pk_single.toFixed(2)}</span></p>
          <p>Pk salvo (×{intercept.salvo_count}) <span className="text-white text-lg">{intercept.pk_salvo.toFixed(2)}</span></p>
        </div>
      )}
      <div className="border-t border-white/5 pt-2 space-y-1 text-[10px] text-slate-400">
        <p>Detect {Math.round(result.detect_range_m).toLocaleString()} m</p>
        <p>Track {Math.round(result.track_range_m).toLocaleString()} m</p>
        <p>Launch {Math.round(result.launch_range_m).toLocaleString()} m</p>
        <p>Lethal {Math.round(result.lethal_range_m).toLocaleString()} m</p>
      </div>
      {intercept?.engagement_notes?.slice(0, 3).map((n) => (
        <p key={n} className="text-[10px] text-slate-400">• {n}</p>
      ))}
    </div>
  )
}
