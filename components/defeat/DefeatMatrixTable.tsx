'use client'

import { MatrixCell } from '@/components/defeat/MatrixCell'
import { getSystemIcon } from '@/lib/defeat/defeat-types'
import type { DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import type {
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'

interface DefeatMatrixTableProps {
  platforms: Platform[]
  systems: AntiDroneSystem[]
  effectiveness: DefeatEffectiveness[]
  defeatTypeFilter: DefeatTypeFilter
  onCellSelect: (platformId: string, systemId: string) => void
}

function findRow(
  effectiveness: DefeatEffectiveness[],
  platformId: string,
  systemId: string
): DefeatEffectiveness | undefined {
  return effectiveness.find(
    (e) => e.platform_id === platformId && e.defeat_system_id === systemId
  )
}

export function DefeatMatrixTable({
  platforms,
  systems,
  effectiveness,
  defeatTypeFilter,
  onCellSelect,
}: DefeatMatrixTableProps) {
  if (platforms.length === 0 || systems.length === 0) {
    return (
      <div className="bg-surf1 border border-border rounded-lg p-12 text-center">
        <p className="text-t-secondary font-mono text-sm">
          No data matches current filters.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto border border-border rounded-lg">
      <table className="w-max min-w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-30 bg-surf1 border border-border px-4 py-3 text-left min-w-[180px]">
              <span className="text-xs font-mono text-t-muted uppercase tracking-wider">
                Platform
              </span>
            </th>
            {systems.map((system) => {
              const Icon = getSystemIcon(system)
              return (
                <th
                  key={system.id}
                  className="sticky top-0 z-20 bg-surf1 border border-border px-3 py-3 text-center min-w-[100px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Icon className="h-4 w-4 text-cyan" />
                    <span className="text-xs font-medium text-t-primary leading-tight">
                      {system.name}
                    </span>
                    <span className="text-[10px] font-mono text-t-muted">
                      {system.country}
                    </span>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {platforms.map((platform) => (
            <tr key={platform.id}>
              <td className="sticky left-0 z-10 bg-surf1 border border-border px-4 py-3">
                <p className="font-semibold text-t-primary text-sm leading-tight">
                  {platform.name}
                </p>
                <p className="text-xs font-mono text-t-muted mt-0.5">
                  {platform.country_of_origin ?? '—'}
                </p>
              </td>
              {systems.map((system) => (
                <MatrixCell
                  key={`${platform.id}-${system.id}`}
                  platform={platform}
                  system={system}
                  row={findRow(effectiveness, platform.id, system.id)}
                  defeatTypeFilter={defeatTypeFilter}
                  onSelect={onCellSelect}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
