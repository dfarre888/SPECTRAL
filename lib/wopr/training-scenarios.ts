/**
 * OSINT WOPR training vignettes — client-safe static scenarios when API unavailable.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import type { WoprScenario } from '@/lib/wopr/types'

const TRAINING_TENANT = 'training-tier'

function vignette(
  id: string,
  name: string,
  red: Array<{ id: string; name: string; lat: number; lon: number }>,
  blue: Array<{ id: string; name: string; lat: number; lon: number }>,
): WoprScenario {
  return {
    id,
    tenant_id: TRAINING_TENANT,
    name,
    classification: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
    elapsed_min: 45,
    status: 'running',
    world_state: {
      battlespace: {
        terrain: 'coastal_urban',
        weather: { wind_kts: 8, visibility_km: 12, cloud_base_ft: 4500 },
        time: { mission_elapsed_min: 45, day_night: 'day' },
      },
      red_orbat: {
        platforms: red.map((p) => ({
          ...p,
          alt_m: 450,
          side: 'red' as const,
          platform_type: 'owa',
          radiating: true,
          destroyed: false,
        })),
      },
      blue_orbat: {
        platforms: blue.map((p) => ({
          ...p,
          alt_m: 80,
          side: 'blue' as const,
          platform_type: 'shorad',
          radiating: true,
          destroyed: false,
        })),
      },
      comms_status: { red: 'up', blue: 'up' },
    },
  }
}

export const TRAINING_WOPR_SCENARIOS: WoprScenario[] = [
  vignette(
    'vignette-kyiv-owa-saturation',
    'Kyiv OWA Saturation — Shahed Wave 3',
    [
      { id: 'red-shahed-1', name: 'Shahed-136 #1', lat: 50.45, lon: 30.52 },
      { id: 'red-shahed-2', name: 'Shahed-136 #2', lat: 50.44, lon: 30.48 },
      { id: 'red-decoy', name: 'Gerbera decoy', lat: 50.46, lon: 30.55 },
    ],
    [
      { id: 'blue-nasams', name: 'NASAMS battery', lat: 50.42, lon: 30.44 },
      { id: 'blue-gepard', name: 'Gepard SPAAG', lat: 50.43, lon: 30.5 },
    ],
  ),
  vignette(
    'vignette-red-sea-usv-strike',
    'Red Sea USV Swarm — HVU Protection',
    [
      { id: 'red-magura', name: 'Magura V5 USV', lat: 14.2, lon: 42.8 },
      { id: 'red-fpv', name: 'FPV relay UAS', lat: 14.25, lon: 42.75 },
    ],
    [
      { id: 'blue-ciw', name: 'Phalanx CIWS', lat: 14.15, lon: 42.85 },
      { id: 'blue-drone-dome', name: 'Drone Dome', lat: 14.18, lon: 42.82 },
    ],
  ),
  vignette(
    'vignette-bakhmut-fpv-corridor',
    'Bakhmut FPV Corridor — Lancet vs Armour',
    [
      { id: 'red-lancet', name: 'Lancet-3 loitering munition', lat: 48.59, lon: 38.0 },
      { id: 'red-fpv-squad', name: 'FPV strike pair', lat: 48.58, lon: 37.98 },
    ],
    [
      { id: 'blue-shorad', name: 'SHORAD picket', lat: 48.57, lon: 37.95 },
      { id: 'blue-ew', name: 'Tier-2 SDR jammer', lat: 48.595, lon: 37.99 },
    ],
  ),
]

export function getTrainingWoprScenario(id?: string | null): WoprScenario | null {
  if (!id) return TRAINING_WOPR_SCENARIOS[0] ?? null
  return TRAINING_WOPR_SCENARIOS.find((s) => s.id === id) ?? TRAINING_WOPR_SCENARIOS[0] ?? null
}
