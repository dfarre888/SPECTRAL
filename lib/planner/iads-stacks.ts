/**
 * IADS Stack Builder — preset layered air defence templates
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

export interface IadsLayer {
  role: 'early_warning' | 'acquisition' | 'engagement' | 'point_defence';
  platformId: string;
  label: string;
  /** Offset from stack anchor (km) */
  offsetKm?: { dx: number; dy: number };
  cueDelay_s?: number;
  engageDelay_s?: number;
}

export interface IadsStackPreset {
  id: string;
  name: string;
  description: string;
  anchor: { lon: number; lat: number };
  layers: IadsLayer[];
  threatContext: string;
  confidence: 'Confirmed' | 'Assessed' | 'Estimated';
}

export interface IadsStackInstance {
  presetId: string;
  name: string;
  anchor: { lon: number; lat: number };
  placedInstanceIds: string[];
  appliedAt: string;
}

export const IADS_STACK_PRESETS: IadsStackPreset[] = [
  {
    id: 'stack-syria-2018',
    name: 'Syria 2018 — Nebo → S-400 → Pantsir',
    description: 'CI-WEST-003 layered IADS as employed against Tomahawk/JASSM strike packages.',
    anchor: { lon: 36.2, lat: 33.5 },
    threatContext: 'Tomahawk / JASSM saturation — CI-WEST-003',
    confidence: 'Assessed',
    layers: [
      { role: 'early_warning', platformId: 'nebo-m', label: 'Nebo-M VHF', offsetKm: { dx: 0, dy: 15 }, cueDelay_s: 0 },
      { role: 'engagement', platformId: 's-400-triumf', label: 'S-400 Triumf', offsetKm: { dx: 0, dy: 0 }, cueDelay_s: 45, engageDelay_s: 90 },
      { role: 'point_defence', platformId: 'pantsir-s1', label: 'Pantsir-S1', offsetKm: { dx: 8, dy: -5 }, cueDelay_s: 15, engageDelay_s: 30 },
    ],
  },
  {
    id: 'stack-ukraine-layered',
    name: 'Ukraine Layered — Nebo → S-300PM2 → Buk → Pantsir',
    description: 'OSINT Ukrainian IADS layering against Shahed/cruise corridors.',
    anchor: { lon: 30.5, lat: 50.4 },
    threatContext: 'Shahed-136 / Kalibr mixed salvo',
    confidence: 'Assessed',
    layers: [
      { role: 'early_warning', platformId: 'nebo-m', label: 'Nebo-M', offsetKm: { dx: 0, dy: 20 } },
      { role: 'engagement', platformId: 's-300pm2', label: 'S-300PM2', offsetKm: { dx: 0, dy: 0 }, cueDelay_s: 60, engageDelay_s: 120 },
      { role: 'engagement', platformId: 'buk-m3', label: 'Buk-M3', offsetKm: { dx: -12, dy: 8 }, cueDelay_s: 30, engageDelay_s: 60 },
      { role: 'point_defence', platformId: 'pantsir-s1', label: 'Pantsir-S1', offsetKm: { dx: 5, dy: -3 } },
    ],
  },
  {
    id: 'stack-taipan-gbad',
    name: 'Taipan Strike 26 — CEAFAR2-L → GBAD CEA-SM-2',
    description: 'ADF GBAD live-fire anchor — CEAFAR2-L cueing SM-2 Block IIIB against LACM.',
    anchor: { lon: 150.8, lat: -21.1 },
    threatContext: 'Kalibr / Kh-101 LACM penetration at 50–100m AGL',
    confidence: 'Assessed',
    layers: [
      { role: 'acquisition', platformId: 'ceafar2-l', label: 'CEAFAR2-L', offsetKm: { dx: 0, dy: 0 }, cueDelay_s: 0 },
      { role: 'engagement', platformId: 'gbad-cea-sm2-aus', label: 'GBAD CEA-SM-2', offsetKm: { dx: 2, dy: -1 }, cueDelay_s: 20, engageDelay_s: 45 },
    ],
  },
  {
    id: 'stack-north-qld-cuas',
    name: 'North QLD C-UAS Belt — Giraffe → NASAMS → Gepard',
    description: 'Shahed swarm economics demo — layered C-UAS belt for northern Australia AO.',
    anchor: { lon: 145.7, lat: -16.9 },
    threatContext: '8× Shahed-136 saturation — 125:1 exchange risk',
    confidence: 'Estimated',
    layers: [
      { role: 'early_warning', platformId: 'giraffe-amb', label: 'Giraffe AMB', offsetKm: { dx: 0, dy: 0 } },
      { role: 'engagement', platformId: 'nasams-amraam-er', label: 'NASAMS AMRAAM-ER', offsetKm: { dx: 5, dy: 3 }, cueDelay_s: 25, engageDelay_s: 50 },
      { role: 'point_defence', platformId: 'gepard-spaag', label: 'Gepard SPAAG', offsetKm: { dx: -3, dy: -2 }, cueDelay_s: 10, engageDelay_s: 20 },
    ],
  },
];

export function getIadsPreset(id: string): IadsStackPreset | undefined {
  return IADS_STACK_PRESETS.find((p) => p.id === id);
}

/** Approximate lat/lon offset from anchor (km). */
export function offsetLatLon(
  anchor: { lon: number; lat: number },
  dxKm: number,
  dyKm: number,
): { lon: number; lat: number } {
  const latRad = (anchor.lat * Math.PI) / 180;
  const dLat = dyKm / 111;
  const dLon = dxKm / (111 * Math.cos(latRad));
  return { lon: anchor.lon + dLon, lat: anchor.lat + dLat };
}
