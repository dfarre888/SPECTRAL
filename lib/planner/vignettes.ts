/**
 * Demo vignettes — Taipan Strike 26 + North QLD C-UAS belt
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { emptyLaydownDocument, type MapLaydownDocument } from '@/lib/planner/battlespace-plan';

export interface PlannerVignette {
  id: string;
  name: string;
  description: string;
  iadsStackId: string;
  terrain?: string;
  economicsHighlight?: { platformId: string; defeatSystemId: string; label: string };
  swarmCount?: number;
  laydownSeed: Partial<Omit<MapLaydownDocument, 'uas'>> & {
    uas?: Array<Omit<MapLaydownDocument['uas'][number], 'mission'> & {
      mission?: Omit<NonNullable<MapLaydownDocument['uas'][number]['mission']>, 'updatedAt'>;
    }>;
  };
}

export const PLANNER_VIGNETTES: PlannerVignette[] = [
  {
    id: 'taipan-strike-26',
    name: 'Taipan Strike 26 — GBAD CEA-SM-2',
    description: 'ADF GBAD live-fire anchor: CEAFAR2-L cueing SM-2 Block IIIB against LACM penetration at 50–100m AGL.',
    iadsStackId: 'stack-taipan-gbad',
    terrain: 'coastal_gbad',
    economicsHighlight: { platformId: 'kalibr-3m14', defeatSystemId: 'gbad-cea-sm2-aus', label: 'SM-2 vs Kalibr exchange' },
    laydownSeed: {
      viewport: { lon: 150.8, lat: -21.1, height_m: 250000 },
      uas: [{
        instanceId: 'vig-taipan-red-1',
        assetId: 'kalibr-3m14',
        lon: 151.2,
        lat: -20.5,
        terrainAMSL: 80,
        discAltitude_m: 120,
        lateralRadius_m: 45000,
        ceilingAMSL_m: 500,
        annotationTime_min: 0,
        effectiveRange_km: 2500,
        mission: {
          goalKind: 'target',
          goalLon: 150.75,
          goalLat: -21.05,
          goalTerrainAMSL: 50,
          waypoints: [],
          emcon: true,
          routeObjective: 'pk',
          manualOverride: false,
          totalDistance_km: 180,
          maxPk_pct: 35,
          maxPd_pct: 40,
          pdExposure_km: 12,
          pkExposure_km: 8,
          pkThresholdExceeded: false,
          pdThresholdExceeded: true,
          pathMode: 'soft-minimize',
        },
      }],
    },
  },
  {
    id: 'north-qld-cuas',
    name: 'North Queensland C-UAS Belt',
    description: 'Shahed swarm economics — 8× Shahed vs Giraffe/NASAMS/Gepard layered belt (125:1 exchange ratio).',
    iadsStackId: 'stack-north-qld-cuas',
    economicsHighlight: { platformId: 'shahed-136', defeatSystemId: 'nasams-amraam-er', label: '125:1 cost catastrophe' },
    swarmCount: 8,
    laydownSeed: {
      viewport: { lon: 145.7, lat: -16.9, height_m: 180000 },
      uas: Array.from({ length: 8 }, (_, i) => ({
        instanceId: `vig-nqld-red-${i + 1}`,
        assetId: 'shahed-136',
        lon: 146.1 + i * 0.08,
        lat: -16.5 + (i % 2) * 0.05,
        terrainAMSL: 200,
        discAltitude_m: 350,
        lateralRadius_m: 8000,
        ceilingAMSL_m: 600,
        annotationTime_min: i * 2,
        effectiveRange_km: 250,
      })),
    },
  },
  {
    id: 'force-scs',
    name: 'Force — South China Sea',
    description: 'AUS/US quality vs PRC mass. UAS layer only — full ORBAT stays on /force. AEW and tanker are the Blue failure points.',
    iadsStackId: 'stack-taipan-gbad',
    terrain: 'maritime_scs',
    laydownSeed: {
      viewport: { lon: 114.3, lat: 12.2, height_m: 1800000 },
      uas: [
        { instanceId: 'force-scs-wl2', assetId: 'wing-loong-2', lon: 115.1, lat: 12.6, terrainAMSL: 80, discAltitude_m: 400, lateralRadius_m: 14000, ceilingAMSL_m: 800, annotationTime_min: 0, effectiveRange_km: 400 },
        { instanceId: 'force-scs-mq9', assetId: 'mq-9-reaper', lon: 113.4, lat: 11.8, terrainAMSL: 80, discAltitude_m: 500, lateralRadius_m: 18000, ceilingAMSL_m: 900, annotationTime_min: 0, effectiveRange_km: 300 },
      ],
    },
  },
  {
    id: 'force-korea',
    name: 'Force — Korean Peninsula',
    description: 'USA increment vs DPRK massed fires. ROK is not in the seven-nation catalog — flag that on the AAR.',
    iadsStackId: 'stack-north-qld-cuas',
    laydownSeed: {
      viewport: { lon: 127.0, lat: 38.0, height_m: 1200000 },
      uas: [
        { instanceId: 'force-kor-shahed', assetId: 'shahed-136', lon: 126.4, lat: 38.4, terrainAMSL: 120, discAltitude_m: 300, lateralRadius_m: 8000, ceilingAMSL_m: 600, annotationTime_min: 0, effectiveRange_km: 250 },
        { instanceId: 'force-kor-lancet', assetId: 'lancet-3', lon: 126.6, lat: 38.2, terrainAMSL: 120, discAltitude_m: 250, lateralRadius_m: 6000, ceilingAMSL_m: 500, annotationTime_min: 0, effectiveRange_km: 70 },
      ],
    },
  },
  {
    id: 'force-north-aus',
    name: 'Force — Northern Australia',
    description: 'Darwin approaches. Pair with the C-UAS belt. PRC is a long-range strike problem, not an occupying land force.',
    iadsStackId: 'stack-north-qld-cuas',
    swarmCount: 4,
    laydownSeed: {
      viewport: { lon: 130.8, lat: -12.4, height_m: 1400000 },
      uas: Array.from({ length: 4 }, (_, i) => ({
        instanceId: `force-naus-red-${i + 1}`,
        assetId: 'shahed-136',
        lon: 131.4 + i * 0.08,
        lat: -11.9 + (i % 2) * 0.05,
        terrainAMSL: 40,
        discAltitude_m: 300,
        lateralRadius_m: 8000,
        ceilingAMSL_m: 550,
        annotationTime_min: i * 2,
        effectiveRange_km: 250,
      })),
    },
  },
];

export function getVignette(id: string): PlannerVignette | undefined {
  return PLANNER_VIGNETTES.find((v) => v.id === id);
}

export function vignetteToLaydown(v: PlannerVignette): MapLaydownDocument {
  const base = emptyLaydownDocument();
  const updatedAt = new Date().toISOString();
  const uas = (v.laydownSeed.uas ?? base.uas).map((u) => ({
    ...u,
    mission: u.mission ? { ...u.mission, updatedAt } : u.mission,
  }));
  return {
    ...base,
    ...v.laydownSeed,
    uas,
    cuas: v.laydownSeed.cuas ?? base.cuas,
    radars: v.laydownSeed.radars ?? base.radars,
    effectors: v.laydownSeed.effectors ?? base.effectors,
    updatedAt,
  };
}

export const getPlannerVignette = getVignette;
