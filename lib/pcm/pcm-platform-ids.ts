/**
 * PCM platform type → catalogue id mappings (OSINT seed + defeat matrix).
 */

import { PLATFORMS } from '@/data/seed-platforms';
import { PLATFORM_ID_ALIASES } from '@/data/osint-platform-enrichment';

export const TYPE_TO_PLATFORM_ID: Record<string, string> = {
  'Shahed-136': 'shahed-136',
  'Shahed-238': 'shahed-238',
  'Lancet-3': 'lancet-3',
  Gerbera: 'gerbera-parody',
  'Bayraktar TB2': 'bayraktar-tb2',
  'Coyote Block 2': 'coyote-block-2',
  FPV_fibre_optic: 'fpv-fibre-optic',
  'Wild Hornet': 'wild-hornet',
  'wild-hornet': 'wild-hornet',
  'Magura V5': 'magura-v5',
  'GJ-11': 'gj-11-sharp-sword',
  'Kargu-2': 'kargu-2',
  'UJ-22 Airborne': 'uj-22-airborne',
  'Coordinated FPV Swarm': 'fpv-swarm-coord',
  'XQ-58A Valkyrie': 'xq-58a-valkyrie',
  'CH-4 Rainbow': 'ch-4-rainbow',
  'Wing Loong II': 'wing-loong-2',
  'wing-loong-ii': 'wing-loong-2',
};

/** PCM defender type → anti_drone_systems.id (Block 2 → Block 3 matrix row). */
export const DEFENDER_TYPE_TO_SYSTEM_ID: Record<string, string> = {
  'Coyote Block 2': 'coyote-block-3',
  'Coyote Block 3': 'coyote-block-3',
  'DroneGun Mk4': 'dronegun-tactical',
  DroneGun_Mk4: 'dronegun-tactical',
  'DroneGun Tactical': 'dronegun-tactical',
  'Drone Dome': 'drone-dome',
  'Iron Beam': 'iron-beam',
  'Edge Horizon': 'edge-horizon',
  'MBDA DragonFire': 'dragonfire-uk',
  DragonFire: 'dragonfire-uk',
  'LIDS': 'lids-system',
  'Leonidas': 'leonidas-hpm',
  MORFIUS: 'morfius',
  'Anduril Lattice': 'anduril-lattice',
  'IRIS-T SLM': 'iris-t-slm-cuas',
};

export function resolvePcmPlatformId(typeName: string): string | null {
  const key = TYPE_TO_PLATFORM_ID[typeName] ?? typeName.toLowerCase().replace(/\s+/g, '-');
  const normalized = PLATFORM_ID_ALIASES[key] ?? key;
  const found = PLATFORMS.find((p) => p.id === normalized || p.name === typeName);
  return found?.id ?? normalized;
}

export function resolveDefenderSystemId(defenderType: string, group: string): string {
  const mapped = DEFENDER_TYPE_TO_SYSTEM_ID[defenderType];
  if (mapped) return mapped;
  if (group === 'c_uas_defeat_kinetic') return 'coyote-block-3';
  if (group === 'c_uas_defeat_ew') return 'dronegun-tactical';
  if (group === 'c_uas_defeat_dew') return 'iron-beam';
  return defenderType.toLowerCase().replace(/\s+/g, '-');
}
