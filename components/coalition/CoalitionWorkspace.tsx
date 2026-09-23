'use client'

import { useMemo, useState, type ReactNode } from 'react'
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

function ControlRow({ label, children, aside }: { label: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start sm:gap-4">
      <p className="pt-1.5 text-[12px] store-text-muted">{label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        {children}
        {aside ? <div className="ml-auto">{aside}</div> : null}
      </div>
    </div>
  )
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
      <div className="store-panel rounded-2xl px-5 py-2">
        <ControlRow
          label="Force"
          aside={
            <p className="text-[12px] store-text-muted">
              <span className="font-mono tabular-nums text-[var(--store-ink)]">{selected.length}</span> platforms ·{' '}
              <span className="font-mono tabular-nums text-[var(--store-ink)]">{activeNations.length}</span> nation
              {activeNations.length === 1 ? '' : 's'}
            </p>
          }
        >
          <div className="seg" role="group" aria-label="Force side">
            {(['blue', 'red'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={side === s}
                onClick={() => {
                  setSide(s)
                  setCustom(null)
                  setPresetId(s === 'blue' ? 'indopac' : 'crink')
                }}
              >
                <i
                  className="h-2 w-2 rounded-full"
                  style={{ background: s === 'blue' ? 'var(--wb-blue)' : 'var(--wb-red)' }}
                  aria-hidden
                />
                {s === 'blue' ? 'Blue' : 'Red'}
              </button>
            ))}
          </div>
        </ControlRow>

        <div className="border-t border-[var(--store-line)]">
          <ControlRow label="Coalition">
            <div className="seg sm flex-wrap" role="group" aria-label="Coalition preset">
              {sidePresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={!custom && presetId === p.id}
                  onClick={() => {
                    setPresetId(p.id)
                    setCustom(null)
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {custom ? (
              <span className="tag blue">Custom mix</span>
            ) : null}
            {custom ? (
              <button type="button" onClick={() => setCustom(null)} className="fc-action">
                Reset to {preset.label}
              </button>
            ) : null}
          </ControlRow>
        </div>

        <div className="border-t border-[var(--store-line)]">
          <ControlRow label="Nations">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Nations in the coalition">
              {nationsForSide.map((n) => {
                const on = activeNations.includes(n.code)
                return (
                  <button
                    key={n.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleNation(n.code)}
                    title={n.name}
                    className="btn-e xs min-w-[46px] justify-center font-mono"
                  >
                    {n.code}
                  </button>
                )
              })}
            </div>
          </ControlRow>
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="store-panel rounded-2xl p-10 text-center">
          <p className="text-[13px] store-text-body">Select at least one nation.</p>
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
