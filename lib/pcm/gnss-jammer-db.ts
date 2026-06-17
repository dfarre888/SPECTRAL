/**
 * OSINT GNSS Jammer Reference Database
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import type { PCM } from '@/lib/pcm/spectral.types';

export interface GnssJammerSpec {
  id: string;
  type: string;
  country_of_origin: string;
  category: 'COTS' | 'MOTS' | 'military';
  jam_bands: string[];
  erp_watts: number;
  effective_radius_km: number;
  mobility: 'fixed' | 'vehicle_mounted' | 'man_portable' | 'airborne';
  constellations_affected: string[];
  notes: string;
  osint_confidence: 'high' | 'medium' | 'low';
  osint_source: string;
  pcm_asset_template: Omit<PCM.EWAsset, 'id' | 'location_grid' | 'affected_platform_ids'>;
}

export const GNSS_JAMMER_DB: GnssJammerSpec[] = [
  {
    id: 'JAMMER-COTS-L1-MINI',
    type: 'Generic L1 GPS Blocker (Chinese manufacture)',
    country_of_origin: 'China',
    category: 'COTS',
    jam_bands: ['L1'],
    erp_watts: 3,
    effective_radius_km: 0.05,
    mobility: 'man_portable',
    constellations_affected: ['GPS', 'Galileo', 'BeiDou B1C', 'GLONASS G1'],
    notes: 'Commercial L1 blocker — short range only.',
    osint_confidence: 'high',
    osint_source: 'FCC enforcement actions, UK Ofcom seizure reports 2019-2023',
    pcm_asset_template: { type: 'Generic L1 GPS Blocker', status: 'inactive', jam_bands: ['L1'], effective_radius_km: 0.05 },
  },
  {
    id: 'JAMMER-COTS-L1L2-VEHICLE',
    type: 'Vehicle GPS Jammer L1/L2 (Chinese manufacture)',
    country_of_origin: 'China',
    category: 'COTS',
    jam_bands: ['L1', 'L2'],
    erp_watts: 15,
    effective_radius_km: 0.2,
    mobility: 'vehicle_mounted',
    constellations_affected: ['GPS', 'Galileo E1', 'BeiDou B1C', 'GLONASS G1', 'GLONASS G2'],
    notes: 'Documented use in Ukraine 2022.',
    osint_confidence: 'high',
    osint_source: 'NAVISP/ESA GPS jamming monitoring, Ukrainian SBU seizure reports',
    pcm_asset_template: { type: 'Vehicle GPS Jammer L1/L2', status: 'inactive', jam_bands: ['L1', 'L2'], effective_radius_km: 0.2 },
  },
  {
    id: 'JAMMER-MOTS-GNSS-MANPACK',
    type: 'GNSS Manpack Jammer (various — MOTS)',
    country_of_origin: 'Russia/China',
    category: 'MOTS',
    jam_bands: ['L1', 'L2', 'L5', 'G1', 'G2'],
    erp_watts: 50,
    effective_radius_km: 2,
    mobility: 'man_portable',
    constellations_affected: ['GPS', 'GLONASS', 'Galileo', 'BeiDou'],
    notes: 'Man-portable multi-band GNSS jammer class.',
    osint_confidence: 'medium',
    osint_source: 'CNAS 2023 drone proliferation report',
    pcm_asset_template: { type: 'GNSS Manpack Jammer (MOTS)', status: 'inactive', jam_bands: ['L1', 'L2', 'L5', 'G1', 'G2'], effective_radius_km: 2 },
  },
  {
    id: 'JAMMER-MIL-OVOCHKA',
    type: 'Ovochka (RP-377) GPS/GLONASS Jammer',
    country_of_origin: 'Russia',
    category: 'military',
    jam_bands: ['L1', 'L2', 'G1', 'G2'],
    erp_watts: 200,
    effective_radius_km: 50,
    mobility: 'vehicle_mounted',
    constellations_affected: ['GPS', 'GLONASS'],
    notes: 'Used extensively in Ukraine 2022–present.',
    osint_confidence: 'high',
    osint_source: 'DFRLab 2023, GPSPatternOfLife.com',
    pcm_asset_template: { type: 'Ovochka (RP-377) GPS/GLONASS Jammer', status: 'inactive', jam_bands: ['L1', 'L2', 'G1', 'G2'], effective_radius_km: 50 },
  },
  {
    id: 'JAMMER-MIL-R330ZH',
    type: 'R-330Zh Zhitel GNSS/Comms Jammer',
    country_of_origin: 'Russia',
    category: 'military',
    jam_bands: ['L1', 'L2', 'L5', 'G1', 'G2', 'E6'],
    erp_watts: 1000,
    effective_radius_km: 120,
    mobility: 'vehicle_mounted',
    constellations_affected: ['GPS', 'GLONASS', 'Galileo'],
    notes: 'Multi-band tactical EW system.',
    osint_confidence: 'high',
    osint_source: 'Oryx Ukraine equipment losses, Janes Electronic Mission Aircraft 2023',
    pcm_asset_template: { type: 'R-330Zh Zhitel', status: 'inactive', jam_bands: ['L1', 'L2', 'L5', 'G1', 'G2', 'E6'], effective_radius_km: 120 },
  },
  {
    id: 'JAMMER-MIL-BORISOGLEBSK2',
    type: 'Borisoglebsk-2 Multi-Band EW Complex',
    country_of_origin: 'Russia',
    category: 'military',
    jam_bands: ['L1', 'L2', 'L5', 'G1', 'G2', 'E6', 'B3'],
    erp_watts: 10000,
    effective_radius_km: 200,
    mobility: 'vehicle_mounted',
    constellations_affected: ['GPS', 'GLONASS', 'Galileo', 'BeiDou'],
    notes: 'Brigade-level EW complex.',
    osint_confidence: 'medium',
    osint_source: 'IISS Military Balance 2023, Swedish FOI report 2022',
    pcm_asset_template: { type: 'Borisoglebsk-2 EW Complex', status: 'inactive', jam_bands: ['L1', 'L2', 'L5', 'G1', 'G2', 'E6', 'B3'], effective_radius_km: 200 },
  },
  {
    id: 'JAMMER-CUAS-NOTA',
    type: 'NOTA Counter-UAS Jammer (Ukrainian)',
    country_of_origin: 'Ukraine',
    category: 'MOTS',
    jam_bands: ['L1', 'L2'],
    erp_watts: 30,
    effective_radius_km: 1.5,
    mobility: 'man_portable',
    constellations_affected: ['GPS', 'GLONASS G1', 'Galileo E1'],
    notes: 'Ukrainian counter-UAS EW system.',
    osint_confidence: 'medium',
    osint_source: 'Defence Express Ukraine, Forbes Defence 2023',
    pcm_asset_template: { type: 'NOTA Counter-UAS Jammer', status: 'inactive', jam_bands: ['L1', 'L2'], effective_radius_km: 1.5 },
  },
  {
    id: 'JAMMER-CUAS-SKYNEX-EW',
    type: 'SKYNEX EW Module (Rheinmetall)',
    country_of_origin: 'Germany',
    category: 'MOTS',
    jam_bands: ['L1', 'L2', 'L5'],
    erp_watts: 200,
    effective_radius_km: 5,
    mobility: 'vehicle_mounted',
    constellations_affected: ['GPS', 'Galileo', 'GLONASS'],
    notes: 'SKYNEX C-UAS tower EW module.',
    osint_confidence: 'medium',
    osint_source: 'Rheinmetall press releases, DSEI 2023',
    pcm_asset_template: { type: 'SKYNEX EW Module', status: 'inactive', jam_bands: ['L1', 'L2', 'L5'], effective_radius_km: 5 },
  },
];

export function jammerToEwAsset(spec: GnssJammerSpec, id: string, location_grid: string): PCM.EWAsset {
  return {
    id,
    type: spec.type,
    status: 'inactive',
    location_grid,
    jam_bands: spec.jam_bands,
    effective_radius_km: spec.effective_radius_km,
    affected_platform_ids: [],
  };
}

export function jammersEffectiveAgainst(guidance: PCM.GuidanceType): GnssJammerSpec[] {
  const gnssDependent: PCM.GuidanceType[] = ['GNSS_INS', 'GNSS_INS_ATR', 'autonomous_swarm'];
  if (!gnssDependent.includes(guidance)) return [];
  return GNSS_JAMMER_DB.filter((j) => j.jam_bands.some((b) => b.startsWith('L') || b.startsWith('G')));
}
