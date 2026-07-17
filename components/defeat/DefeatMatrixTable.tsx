'use client'

import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { MatrixCell } from '@/components/defeat/MatrixCell'
import type { DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import type {
  AccreditedDefeatPkRow,
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
  accreditedPkMap?: Record<string, AccreditedDefeatPkRow>
  computedSamPkMap?: Record<string, number>
  variant?: 'default' | 'fullscreen'
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
  accreditedPkMap,
  computedSamPkMap,
  variant = 'default',
}: DefeatMatrixTableProps) {
  const platformColMin = variant === 'fullscreen' ? 'min-w-[220px]' : 'min-w-[180px]'
  const systemColMin = variant === 'fullscreen' ? 'min-w-[120px]' : 'min-w-[100px]'
  if (platforms.length === 0 || systems.length === 0) {
    return (
      <div className="store-panel rounded-2xl p-12 text-center">
        <p className="store-text-body text-sm">
          No data matches current filters.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto store-panel rounded-2xl">
      <table className="w-max min-w-full border-collapse">
        <thead>
          <tr>
            <th className={`sticky left-0 z-30 bg-[var(--store-surface)] border border-[var(--store-line)] px-4 py-3 text-left ${platformColMin}`}>
              <span className="text-xs store-text-muted uppercase tracking-wider font-semibold">
                Platform
              </span>
            </th>
            {systems.map((system) => (
                <th
                  key={system.id}
                  className={`sticky top-0 z-20 bg-[var(--store-surface)] border border-[var(--store-line)] px-3 py-3 text-center ${systemColMin}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <PlatformThumbnail
                      id={system.id}
                      name={system.name}
                      size="sm"
                      variant="cuas"
                    />
                    <span className="text-xs font-medium text-white leading-tight">
                      {system.name}
                    </span>
                    <span className="text-[10px] font-mono store-text-muted">
                      {system.country}
                    </span>
                  </div>
                </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {platforms.map((platform) => (
            <tr key={platform.id}>
              <td className="sticky left-0 z-10 bg-[var(--store-surface)] border border-[var(--store-line)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <PlatformThumbnail id={platform.id} name={platform.name} size="sm" />
                  <p className="font-semibold text-white text-sm leading-tight">
                    {platform.name}
                  </p>
                </div>
                <p className="text-xs font-mono store-text-muted mt-0.5">
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
                    accreditedPkMap={accreditedPkMap}
                    computedSamPkMap={computedSamPkMap}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    {accreditedPkMap && Object.keys(accreditedPkMap).length > 0 && (
      <p className="mt-3 px-2 text-[11px] font-mono store-text-muted">
        <span className="text-[#F97316]">A</span> Training-contract analogue · blank OSINT estimate
      </p>
    )}
    </div>
  )
}
