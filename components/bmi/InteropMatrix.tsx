'use client'

import type { InteropLink } from '@/lib/bmi/bmi-types'

const METHOD_STYLE: Record<
  InteropLink['method'],
  { bg: string; label: string }
> = {
  direct: { bg: 'bg-[var(--store-success)]/30', label: 'Direct datalink' },
  via_gateway: { bg: 'bg-[var(--store-gold)]/25', label: 'Via gateway' },
  voice_only: { bg: 'bg-[var(--store-surface-2)]', label: 'Voice only' },
  none: { bg: 'bg-red-500/15', label: 'No link' },
}

interface InteropMatrixProps {
  platformIds: string[]
  platformLabels: Record<string, string>
  links: InteropLink[]
  gateways: { gateway_id: string; bridges: string[] }[]
  selectedA?: string | null
  selectedB?: string | null
  onSelectCell?: (a: string, b: string) => void
}

export function InteropMatrix({
  platformIds,
  platformLabels,
  links,
  gateways,
  selectedA,
  selectedB,
  onSelectCell,
}: InteropMatrixProps) {
  function linkFor(a: string, b: string): InteropLink | undefined {
    return links.find(
      (l) => (l.a_id === a && l.b_id === b) || (l.a_id === b && l.b_id === a),
    )
  }

  return (
    <div className="space-y-4">
      {gateways.length > 0 ? (
        <div className="ring-gradient glass rounded-xl p-3 border border-[var(--store-gold-border)]">
          <p className="eyebrow text-[10px] text-[var(--store-gold)] mb-2">
            Critical gateway nodes
          </p>
          <p className="text-xs store-text-muted mb-2">
            Lose these and the coalition picture fragments.
          </p>
          <div className="flex flex-wrap gap-2">
            {gateways.map((g) => (
              <div
                key={g.gateway_id}
                className="text-xs font-mono px-2 py-1 rounded-lg border border-[var(--store-gold-border)] bg-[var(--store-gold-glow)] text-[var(--store-gold)]"
              >
                {platformLabels[g.gateway_id] ?? g.gateway_id}
                <span className="store-text-muted ml-1">
                  → {g.bridges.length} bridge(s)
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto ring-gradient glass rounded-xl p-3">
        <table className="text-[10px] font-mono border-collapse min-w-full">
          <thead>
            <tr>
              <th className="p-1 store-text-muted" />
              {platformIds.map((id) => (
                <th
                  key={id}
                  className="p-1 store-text-muted max-w-[4rem] truncate rotate-0"
                  title={platformLabels[id] ?? id}
                >
                  {(platformLabels[id] ?? id).split('-').pop()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {platformIds.map((a) => (
              <tr key={a}>
                <td className="p-1 store-text-muted truncate max-w-[6rem]" title={a}>
                  {(platformLabels[a] ?? a).split('-').pop()}
                </td>
                {platformIds.map((b) => {
                  if (a === b) {
                    return (
                      <td key={b} className="p-0.5">
                        <div className="w-4 h-4 bg-[var(--store-surface-2)] rounded" />
                      </td>
                    )
                  }
                  const link = linkFor(a, b)
                  const method = link?.method ?? 'none'
                  const style = METHOD_STYLE[method]
                  const selected =
                    (selectedA === a && selectedB === b) ||
                    (selectedA === b && selectedB === a)
                  return (
                    <td key={b} className="p-0.5">
                      <button
                        type="button"
                        title={link?.note ?? method}
                        onClick={() => onSelectCell?.(a, b)}
                        className={`w-4 h-4 rounded transition-shadow hover:brightness-125 ${style.bg} ${
                          selected ? 'ring-2 ring-[var(--store-accent)] shadow-[0_0_8px_rgba(99,102,241,0.45)]' : ''
                        }`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] store-text-muted">
        {Object.entries(METHOD_STYLE).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${v.bg}`} />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  )
}
