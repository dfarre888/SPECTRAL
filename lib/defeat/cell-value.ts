import {
  defeatTypeToPctField,
  getPrimaryDefeatType,
  systemIsRfType,
  type DefeatTypeFilter,
} from '@/lib/defeat/defeat-types'
import type { LaydownSessionPair } from '@/lib/map/laydown-session'
import { resolveCotsDefeatPct } from '@/lib/a3dm/cots-defeat'
import type {
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'

export type CellColour = 'red' | 'amber' | 'green' | 'immune' | 'none'

export type CellValue =
  | { kind: 'immune'; reason: string | null }
  | { kind: 'pct'; value: number; colour: CellColour; laydown?: LaydownPropagationBadge }
  | { kind: 'empty' }

export interface LaydownPropagationBadge {
  operationsPk: number | null
  jamToSignal_db: number | null
  los_state: string
  propagationGated: boolean
  mapHref: string
}

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
  defeatTypeFilter: DefeatTypeFilter = 'all',
  laydownPair?: LaydownSessionPair | null,
  computedSamPk?: number | null,
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


  const kineticView =
    defeatTypeFilter === 'Kinetic' ||
    (defeatTypeFilter === 'all' &&
      (getPrimaryDefeatType(system) === 'Kinetic' || getPrimaryDefeatType(system) === 'Net'))

  if (!row) {
    if (kineticView && computedSamPk != null) {
      return { kind: 'pct', value: computedSamPk, colour: getCellColour(computedSamPk) }
    }
    const cots = resolveCotsDefeatPct(platform, system, defeatTypeFilter)
    if (cots != null) return { kind: 'pct', value: cots, colour: getCellColour(cots) }
    return { kind: 'empty' }
  }

  let pct = getPctForSystem(row, system, defeatTypeFilter)
  if (pct === null) {
    if (kineticView && computedSamPk != null) {
      return { kind: 'pct', value: computedSamPk, colour: getCellColour(computedSamPk) }
    }
    const cots = resolveCotsDefeatPct(platform, system, defeatTypeFilter)
    if (cots != null) return { kind: 'pct', value: cots, colour: getCellColour(cots) }
    return { kind: 'empty' }
  }

  if (kineticView && computedSamPk != null) {
    pct = computedSamPk
  }

  const badge: LaydownPropagationBadge | undefined = laydownPair
    ? {
        operationsPk: laydownPair.operationsPk,
        jamToSignal_db: laydownPair.jamToSignal_db,
        los_state: laydownPair.los_state,
        propagationGated: laydownPair.propagationGated,
        mapHref: `/map?stage=${platform.id}&cuas=${system.id}&from=defeat`,
      }
    : undefined

  return { kind: 'pct', value: pct, colour: getCellColour(pct), laydown: badge }
}

export function cellValueToDisplay(value: CellValue): string {
  if (value.kind === 'immune') return 'IMMUNE'
  if (value.kind === 'empty') return '—'
  return `${value.value}%`
}
