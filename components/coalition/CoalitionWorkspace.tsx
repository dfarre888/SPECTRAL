'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { CommsLinkageView } from '@/components/coalition/CommsLinkageView'
import type { InteropPlatform } from '@/lib/coalition/interop'

export interface CoalitionPreset {
  id: string
  label: string
  side: 'blue' | 'red'
  nations: string[]
}

export const COALITION_PRESETS: CoalitionPreset[] = [
  { id: 'aus', label: 'Australia', side: 'blue', nations: ['AUS'] },
  { id: 'aukus', label: 'AUKUS', side: 'blue', nations: ['AUS', 'USA', 'GBR'] },
  { id: 'fvey', label: 'Five Eyes', side: 'blue', nations: ['AUS', 'USA', 'GBR', 'CAN', 'NZL'] },
  { id: 'indopac', label: 'Indo-Pacific Blue', side: 'blue', nations: ['AUS', 'USA', 'JPN', 'KOR'] },
  { id: 'nato-eu', label: 'NATO Europe', side: 'blue', nations: ['GBR', 'FRA', 'DEU', 'ESP', 'SWE', 'FIN'] },
  { id: 'chn', label: 'China', side: 'red', nations: ['CHN'] },
  { id: 'rus', label: 'Russia', side: 'red', nations: ['RUS'] },
  { id: 'crink', label: 'CRINK', side: 'red', nations: ['CHN', 'RUS', 'PRK', 'IRN'] },
  { id: 'irregular', label: 'Irregular / proxy', side: 'red', nations: ['HOU', 'HEZ', 'HMS', 'WAG', 'ISI'] },
]

interface CoalitionWorkspaceProps {
  platforms: InteropPlatform[]
  nations: { code: string; name: string; side: string }[]
}

export function CoalitionWorkspace({ platforms, nations }: CoalitionWorkspaceProps) {
  const [side, setSide] = useState<'blue' | 'red'>('blue')
  const [presetId, setPresetId] = useState('indopac')
  const [custom, setCustom] = useState<string[] | null>(null)

  const preset = COALITION_PRESETS.find((p) => p.id === presetId) ?? COALITION_PRESETS[3]
  const activeNations = custom ?? preset.nations

  const selected = useMemo(
    () => platforms.filter((p) => activeNations.includes(p.nationCode)),
    [platforms, activeNations],
  )

  const sidePresets = COALITION_PRESETS.filter((p) => p.side === side)
  const nationsForSide = nations
    .filter((n) => (side === 'blue' ? n.side !== 'red' : n.side === 'red'))
    .sort((a, b) => a.name.localeCompare(b.name))

  const toggleNation = (code: string) => {
    const base = custom ?? preset.nations
    setCustom(base.includes(code) ? base.filter((c) => c !== code) : [...base, code])
  }

  return (
    <div className="space-y-4">
      <div className="store-panel rounded-2xl p-4">
        {/* Side */}
        <div className="flex gap-2 mb-3">
          {(['blue', 'red'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSide(s)
                setCustom(null)
                setPresetId(s === 'blue' ? 'indopac' : 'crink')
              }}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors',
                side === s
                  ? s === 'blue'
                    ? 'border-cyan/50 text-cyan bg-cyan/10'
                    : 'border-red-500/50 text-red-300 bg-red-500/10'
                  : 'store-panel-inner store-text-muted hover:border-[var(--store-accent-border)]',
              )}
            >
              {s === 'blue' ? 'BLUE' : 'RED'}
            </button>
          ))}
          <div className="flex-1" />
          <p className="text-[10px] font-mono store-text-muted self-center">
            {selected.length} platforms · {activeNations.length} nation{activeNations.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Presets */}
        <p className="text-[10px] font-mono uppercase tracking-wider store-text-muted mb-1.5">Coalition</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {sidePresets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPresetId(p.id); setCustom(null) }}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors',
                !custom && presetId === p.id
                  ? 'nav-item-active'
                  : 'store-panel-inner store-text-body hover:border-[var(--store-accent-border)]',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Nation picker */}
        <p className="text-[10px] font-mono uppercase tracking-wider store-text-muted mb-1.5">
          Nations {custom ? '(custom)' : ''}
        </p>
        <div className="flex flex-wrap gap-1">
          {nationsForSide.map((n) => {
            const on = activeNations.includes(n.code)
            return (
              <button
                key={n.code}
                type="button"
                onClick={() => toggleNation(n.code)}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-mono border transition-colors',
                  on
                    ? 'border-[var(--store-accent-border)] text-[var(--store-accent)] bg-[var(--store-accent)]/10'
                    : 'store-panel-inner store-text-muted hover:store-text-body',
                )}
              >
                {n.code}
              </button>
            )
          })}
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="store-panel rounded-2xl p-8 text-center">
          <p className="text-xs store-text-muted font-mono">Select at least one nation.</p>
        </div>
      ) : (
        <CommsLinkageView
          platforms={selected}
          side={side}
          title={custom ? `${activeNations.join(' + ')}` : preset.label}
        />
      )}
    </div>
  )
}
