/**
 * Default map anchors for case-study regions (OSINT approximate).
 */
export const CASE_STUDY_REGION_ANCHOR: Record<string, { lat: number; lon: number }> = {
  'ukraine-naval-usv': { lat: 44.6, lon: 33.8 },
  'red-sea-hvu': { lat: 14.5, lon: 42.9 },
  'black-sea-usv-swarm': { lat: 44.6, lon: 33.8 },
}

export const CASE_STUDY_INCIDENT_GEO: Record<string, { lat: number; lon: number; incident_type?: string }> = {
  'magura-kerch-2024': { lat: 45.35, lon: 36.47, incident_type: 'naval' },
  'red-sea-owa-2024': { lat: 12.58, lon: 43.33, incident_type: 'naval' },
}
