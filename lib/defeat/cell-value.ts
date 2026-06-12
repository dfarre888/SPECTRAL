import {
  defeatTypeToPctField,
  getPrimaryDefeatType,
  systemIsRfType,
  type DefeatTypeFilter,
} from '@/lib/defeat/defeat-types'
import type {
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'

export type CellColour = 'red' | 'amber' | 'green' | 'immune' | 'none'

export type CellValue =
  | { kind: 'immune'; reason: string | null }
  | { kind: 'pct'; value: number; colour: CellColour }
  | { kind: 'empty' }

export function getCellColour(pct: number): Exclude<CellColour, 'immune' | 'none'> {
  if (pct <= 30) return 'red'
  if (pct <= 70) return 'amber'
  return 'green'
}

function getPctForSystem(
  row: DefeatEffectiveness,
  system: AntiDroneSystem,
  defeatTypeFilter: DefeatTypeFilter
): number | null {
  const overrideField = defeatTypeFilter !== 'all' ? defeatTypeToPctField(defeatTypeFilter) : null
  if (overrideField) return row[overrideField]

  const primary = getPrimaryDefeatType(system)
  switch (primary) {
    case 'RF':
      return row.rf_jamming_pct
    case 'Kinetic':
    case 'Net':
      return row.kinetic_pct
    case 'DEW':
      return row.dew_pct
    default:
      return row.rf_jamming_pct ?? row.kinetic_pct ?? row.dew_pct
  }
}

export function resolveCellValue(
  platform: Platform,
  system: AntiDroneSystem,
  row: DefeatEffectiveness | undefined,
  defeatTypeFilter: DefeatTypeFilter = 'all'
): CellValue {
  if (row?.is_immune) {
    return { kind: 'immune', reason: row.immune_reason }
  }

  if (platform.guidance_type === 'fibre_optic' && systemIsRfType(system)) {
    return {
      kind: 'immune',
      reason: 'No RF datalink — fibre-optic tether',
    }
  }

  if (
    platform.gnss_independent &&
    systemIsRfType(system) &&
    defeatTypeFilter !== 'Kinetic' &&
    defeatTypeFilter !== 'DEW'
  ) {
    if (!row || row.rf_jamming_pct === 0) {
      return {
        kind: 'immune',
        reason: 'GNSS-free navigation — RF jamming ineffective',
      }
    }
  }

  if (!row) return { kind: 'empty' }

  const pct = getPctForSystem(row, system, defeatTypeFilter)
  if (pct === null) return { kind: 'empty' }

  return { kind: 'pct', value: pct, colour: getCellColour(pct) }
}

export function cellValueToDisplay(value: CellValue): string {
  if (value.kind === 'immune') return 'IMMUNE'
  if (value.kind === 'empty') return '—'
  return `${value.value}%`
}
