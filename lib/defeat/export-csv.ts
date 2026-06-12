import { resolveCellValue, cellValueToDisplay } from '@/lib/defeat/cell-value'
import type { DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import type {
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'

function findEffectiveness(
  effectiveness: DefeatEffectiveness[],
  platformId: string,
  systemId: string
): DefeatEffectiveness | undefined {
  return effectiveness.find(
    (e) => e.platform_id === platformId && e.defeat_system_id === systemId
  )
}

export function exportMatrixCsv(
  platforms: Platform[],
  systems: AntiDroneSystem[],
  effectiveness: DefeatEffectiveness[],
  defeatTypeFilter: DefeatTypeFilter = 'all'
): void {
  const headers = [
    'Platform',
    'Country',
    'Category',
    ...systems.map((s) => s.name),
  ]

  const rows = platforms.map((platform) => {
    const cells = systems.map((system) => {
      const row = findEffectiveness(effectiveness, platform.id, system.id)
      const value = resolveCellValue(platform, system, row, defeatTypeFilter)
      return cellValueToDisplay(value)
    })
    return [
      platform.name,
      platform.country_of_origin ?? '',
      platform.category,
      ...cells,
    ]
  })

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'spectral-defeat-matrix.csv'
  link.click()
  URL.revokeObjectURL(url)
}
