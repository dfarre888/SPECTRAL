import { Crosshair, Grid3x3, Radio, Zap, type LucideIcon } from 'lucide-react'
import type { AntiDroneSystem, DefeatMethod } from '@/lib/types'

export type DefeatTypeFilter = 'all' | 'RF' | 'Kinetic' | 'DEW' | 'Net'

const RF_METHODS: DefeatMethod[] = ['RF_jamming', 'spoofing', 'cyber']
const KINETIC_METHODS: DefeatMethod[] = ['kinetic', 'combined']
const DEW_METHODS: DefeatMethod[] = ['laser', 'directed_energy', 'EMP']
const NET_METHODS: DefeatMethod[] = ['net']

export const DEFEAT_TYPE_FILTERS: { id: DefeatTypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'RF', label: 'RF' },
  { id: 'Kinetic', label: 'Kinetic' },
  { id: 'DEW', label: 'DEW' },
  { id: 'Net', label: 'Net' },
]

export function getPrimaryDefeatType(system: AntiDroneSystem): DefeatTypeFilter {
  const methods = system.defeat_method ?? []
  if (methods.some((m) => RF_METHODS.includes(m))) return 'RF'
  if (methods.some((m) => DEW_METHODS.includes(m))) return 'DEW'
  if (methods.some((m) => NET_METHODS.includes(m))) return 'Net'
  if (methods.some((m) => KINETIC_METHODS.includes(m))) return 'Kinetic'
  return 'RF'
}

export function systemMatchesDefeatType(
  system: AntiDroneSystem,
  filter: DefeatTypeFilter
): boolean {
  if (filter === 'all') return true
  const methods = system.defeat_method ?? []
  switch (filter) {
    case 'RF':
      return methods.some((m) => RF_METHODS.includes(m))
    case 'Kinetic':
      return methods.some((m) => KINETIC_METHODS.includes(m))
    case 'DEW':
      return methods.some((m) => DEW_METHODS.includes(m))
    case 'Net':
      return methods.some((m) => NET_METHODS.includes(m))
    default:
      return true
  }
}

export function systemIsRfType(system: AntiDroneSystem): boolean {
  return systemMatchesDefeatType(system, 'RF')
}

const ICON_MAP: Record<Exclude<DefeatTypeFilter, 'all'>, LucideIcon> = {
  RF: Radio,
  Kinetic: Crosshair,
  DEW: Zap,
  Net: Grid3x3,
}

export function getSystemIcon(system: AntiDroneSystem): LucideIcon {
  const type = getPrimaryDefeatType(system)
  if (type === 'all') return Radio
  return ICON_MAP[type]
}

export function defeatTypeToPctField(
  filter: DefeatTypeFilter
): 'rf_jamming_pct' | 'kinetic_pct' | 'dew_pct' | null {
  switch (filter) {
    case 'RF':
      return 'rf_jamming_pct'
    case 'Kinetic':
    case 'Net':
      return 'kinetic_pct'
    case 'DEW':
      return 'dew_pct'
    default:
      return null
  }
}
