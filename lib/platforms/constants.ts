import type { PlatformCategory } from '@/lib/types'

/** Short kicker labels for store-style catalog cards. */
export const CATEGORY_SHORT: Partial<Record<PlatformCategory, string>> = {
  MALE: 'MALE',
  HALE: 'HALE',
  tactical: 'TACTICAL',
  loitering_munition: 'OWA',
  FPV: 'FPV',
  naval: 'NAVAL',
  VTOL: 'VTOL',
  fixed_wing_tactical: 'FW TAC',
  interceptor_uas: 'INTERCEPTOR',
  combat_hexacopter: 'HEXACOPTER',
  carrier_uas: 'CARRIER UAS',
  tube_launched_lm: 'TUBE LM',
  // C-UAS / effector categories
  c_uas_gun: 'C-UAS GUN',
  c_uas_laser: 'LASER DEW',
  c_uas_rf: 'EW C-UAS',
  manpads: 'MANPADS',
  c_uas_system: 'C-UAS SYS',
  // Missile categories
  ballistic_missile_srbm: 'SRBM',
  ballistic_missile_mrbm: 'MRBM',
  cruise_missile: 'CRUISE',
}

export const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  MALE: 'MALE',
  HALE: 'HALE',
  tactical: 'Tactical',
  loitering_munition: 'OWA / Loitering Munition',
  FPV: 'FPV',
  naval: 'Naval',
  VTOL: 'VTOL',
  fixed_wing_tactical: 'Fixed-Wing Tactical',
  interceptor_uas: 'Interceptor UAS',
  combat_hexacopter: 'Combat Hexacopter',
  carrier_uas: 'Carrier UAS / Tanker',
  tube_launched_lm: 'Tube-Launched LM',
  // C-UAS / effector categories
  c_uas_gun: 'C-UAS Gun / Cannon',
  c_uas_laser: 'Laser Directed Energy Weapon',
  c_uas_rf: 'Electronic Warfare C-UAS',
  manpads: 'MANPADS',
  c_uas_system: 'C-UAS Defeat System',
  // Missile categories
  ballistic_missile_srbm: 'Short-Range Ballistic Missile (SRBM)',
  ballistic_missile_mrbm: 'Medium-Range Ballistic Missile (MRBM)',
  cruise_missile: 'Land-Attack Cruise Missile',
}

export type CategoryPill =
  | 'all'
  | 'male_hale'
  | 'fpv'
  | 'owa'
  | 'gnss_shortcut'
  | 'cuas_shortcut'
  | 'sovereign'
  | 'missiles'

export const CATEGORY_PILLS: { id: CategoryPill; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'male_hale', label: 'MALE/HALE' },
  { id: 'fpv', label: 'FPV' },
  { id: 'owa', label: 'OWA/Loitering Munition' },
  { id: 'missiles', label: 'Ballistic & Cruise' },
  { id: 'gnss_shortcut', label: 'GNSS Jammer' },
  { id: 'cuas_shortcut', label: 'C-UAS' },
  { id: 'sovereign', label: 'Sovereign Programmes' },
]

export function matchesCategoryPill(category: PlatformCategory, pill: CategoryPill): boolean {
  if (pill === 'sovereign') return false
  if (pill === 'all') return true
  if (pill === 'male_hale') return category === 'MALE' || category === 'HALE'
  if (pill === 'fpv') return category === 'FPV'
  if (pill === 'owa') {
    return (
      category === 'loitering_munition' ||
      category === 'tube_launched_lm'
    )
  }
  if (pill === 'missiles') {
    return (
      category === 'ballistic_missile_srbm' ||
      category === 'ballistic_missile_mrbm' ||
      category === 'cruise_missile'
    )
  }
  return true
}
