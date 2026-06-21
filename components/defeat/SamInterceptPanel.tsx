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
import { cn } from '@/lib/utils'

const TARGET_CATEGORIES: UasTargetCategory[] = [
  'fpv', 'owa', 'loitering_munition', 'tactical_isr', 'male', 'hale',
]
const ECM_LEVELS: EcmLevel[] = ['none', 'basic', 'advanced', 'military_grade']

function pkBarColor(pk: number): string {
  if (pk < 0.3) return '#22C55E'
  if (pk < 0.6) return '#EAB308'
  return '#EF4444'
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

  return (
    <div className="w-[320px] rounded-xl border border-[var(--store-line)] bg-[#0A0A0F] shadow-2xl flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--store-line)] px-3 py-2.5">
        <div className="flex items-center gap-2 text-[#F97316] text-xs font-semibold uppercase tracking-wide">
          <Zap className="h-4 w-4" /> SAM Intercept Calculator
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-slate-400">System</span>
          <select value={systemId} onChange={(e) => setSystemId(e.target.value)} className="w-full rounded-md border border-[var(--store-line)] bg-[#111118] px-2 py-1.5 text-white font-mono text-[11px]">
            {systemOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </label>
        <div className="space-y-1">
          <span className="text-[10px] uppercase text-slate-400">Target</span>
          <div className="flex flex-wrap gap-1">
            {TARGET_CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => setTarget(cat)} className={cn('rounded px-2 py-1 text-[10px] font-mono border', target === cat ? 'bg-[#F97316] border-[#F97316] text-white' : 'border-white/10 text-slate-400')}>
                {cat.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] text-slate-400">Slant range (m)</span>
            <input type="range" min={0} max={40000} step={500} value={slantRange} onChange={(e) => setSlantRange(Number(e.target.value))} className="w-full" />
            <span className="font-mono text-[11px] text-cyan">{slantRange.toLocaleString()}</span>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-slate-400">Target alt (m)</span>
            <input type="range" min={0} max={30000} step={100} value={targetAlt} onChange={(e) => setTargetAlt(Number(e.target.value))} className="w-full" />
            <span className="font-mono text-[11px] text-cyan">{targetAlt.toLocaleString()}</span>
          </label>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400">Salvo</span>
          <div className="flex gap-1">{[1,2,3,4].map((n) => (
            <button key={n} type="button" onClick={() => setSalvoCount(n)} className={cn('flex-1 rounded border py-1 font-mono text-[11px]', salvoCount===n ? 'border-[#F97316] bg-[#F97316]/20 text-white' : 'border-white/10 text-slate-400')}>×{n}</button>
          ))}</div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400">ECM</span>
          <div className="flex flex-wrap gap-1">{ECM_LEVELS.map((level) => (
            <button key={level} type="button" onClick={() => setEcmLevel(level)} className={cn('rounded px-2 py-1 text-[10px] font-mono border', ecmLevel===level ? 'bg-[#F97316] border-[#F97316] text-white' : 'border-white/10 text-slate-400')}>{level.replace(/_/g,' ')}</button>
          ))}</div>
        </div>
        {result && (
          <div className="rounded-lg border border-[var(--store-line)] bg-[#111118] p-3 space-y-3">
            <div className={cn('text-center text-[10px] font-semibold uppercase py-1 rounded', result.in_envelope ? 'bg-emerald-950/80 text-emerald-400' : 'bg-[#7F1D1D] text-[#EF4444]')}>
              {result.in_envelope ? 'In envelope: yes' : 'Out of engagement envelope'}
            </div>
            {result.in_envelope && (
              <>
                <PkRow label="Pk single" value={result.pk_single} />
                <PkRow label={`Pk salvo (×${result.salvo_count})`} value={result.pk_salvo} />
                <div className="text-[10px] font-mono text-slate-400 space-y-1 border-t border-white/5 pt-2">
                  <p>Range factor {result.range_factor.toFixed(2)}</p>
                  <p>Altitude factor {result.altitude_factor.toFixed(2)}</p>
                  <p>ECM factor {result.ecm_factor.toFixed(2)}</p>
                </div>
                {result.engagement_notes.length > 0 && (
                  <ul className="text-[10px] text-slate-300 list-disc pl-3 space-y-0.5">{result.engagement_notes.map((n) => <li key={n}>{n}</li>)}</ul>
                )}
                {result.recommended_response && <p className="text-[10px] text-slate-300">{result.recommended_response}</p>}
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
      <div className="flex justify-between text-[10px] text-slate-400"><span>{label}</span><span className="font-mono text-xl" style={{ color }}>{value.toFixed(2)}</span></div>
      <div className="h-1.5 rounded-full bg-black/40"><div className="h-full rounded-full" style={{ width: `${Math.min(100,value*100)}%`, background: color }} /></div>
    </div>
  )
}
