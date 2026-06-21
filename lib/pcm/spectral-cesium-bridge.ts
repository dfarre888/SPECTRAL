/**
 * SPECTRAL PCM — Cesium globe bridge
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types';
import type { PCM } from '@/lib/pcm/spectral.types';
import { gridRef, gridToLatLon } from '@/lib/pcm/pcm-spectrum-bridge';
import { resolveDefenderSensorRange } from '@/lib/pcm/platform-performance-view';

export type PlayerGlobeRole = 'blue' | 'red' | 'ref';
export const SPECTRAL_CESIUM_COLOURS = { BLUE_FORCE: '#4a9eff', RED_FORCE: '#f87171', CONTACT: '#fb923c', ENVELOPE: '#06B6D4', ENGAGEMENT: '#F97316', FOG: '#1e3a5f' } as const;
export interface PlatformCesiumEntity { platform_id: string; entityId: string; labelId: string }
export interface DetectionEnvelopePrimitive { contact_id: string; entityId: string }
export interface FogOfWarOverlay { blueCoverage: string[]; ewDegradationZones: string[] }

function platformPosition(platform: PCM.Platform) {
  const g = gridToLatLon(gridRef(platform));
  return { lat: g.lat, lon: g.lon, alt: platform.altitude_m ?? 0 };
}
function spectralProperty(Cesium: CesiumModule, value = true) {
  return new Cesium.ConstantProperty(value);
}

export function worldStateToCesiumEntities(Cesium: CesiumModule, viewer: CesiumViewer, ws: PCM.WorldState, sensorPicture: PCM.Contact[], role: PlayerGlobeRole) {
  const platformEntities: PlatformCesiumEntity[] = [];
  const contactEntities: DetectionEnvelopePrimitive[] = [];
  const visibleRed = role === 'red' || role === 'ref';
  for (const p of [...ws.blue_force.platforms, ...(visibleRed ? ws.red_force.platforms : [])]) {
    if (p.status === 'destroyed') continue;
    const pp = platformPosition(p);
    const isBlue = ws.blue_force.platforms.some((b) => b.id === p.id);
    const id = 'spectral-platform-' + p.id;
    viewer.entities.add({ id, position: Cesium.Cartesian3.fromDegrees(pp.lon, pp.lat, pp.alt), point: { pixelSize: 10, color: Cesium.Color.fromCssColorString(isBlue ? SPECTRAL_CESIUM_COLOURS.BLUE_FORCE : SPECTRAL_CESIUM_COLOURS.RED_FORCE) }, properties: { spectral: spectralProperty(Cesium) } });
    platformEntities.push({ platform_id: p.id, entityId: id, labelId: id });
  }
  for (const c of sensorPicture) {
    const loc = c.location_grid ? gridToLatLon(String(c.location_grid)) : gridToLatLon('ECHO-7');
    const id = 'spectral-contact-' + c.contact_id;
    viewer.entities.add({ id, position: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, c.altitude_m ?? 100), point: { pixelSize: 8, color: Cesium.Color.fromCssColorString(SPECTRAL_CESIUM_COLOURS.CONTACT) }, properties: { spectral: spectralProperty(Cesium) } });
    contactEntities.push({ contact_id: c.contact_id, entityId: id });
  }
  return { platformEntities, contactEntities, trackLines: [] as string[], headingLines: [] as string[] };
}

export function buildDetectionEnvelopes(Cesium: CesiumModule, viewer: CesiumViewer, ws: PCM.WorldState): DetectionEnvelopePrimitive[] {
  const primitives: DetectionEnvelopePrimitive[] = [];
  for (const defender of ws.blue_force.platforms) {
    if (defender.status === 'destroyed') continue;
    const rangeKm = resolveDefenderSensorRange(defender, 'radar', defender.sensor ?? 'generic-radar');
    if (!rangeKm || rangeKm <= 0) continue;
    const pp = platformPosition(defender);
    const id = 'spectral-envelope-' + defender.id;
    const radiusM = rangeKm * 1000;
    viewer.entities.add({ id, position: Cesium.Cartesian3.fromDegrees(pp.lon, pp.lat, pp.alt), ellipse: { semiMajorAxis: radiusM, semiMinorAxis: radiusM, material: Cesium.Color.fromCssColorString(SPECTRAL_CESIUM_COLOURS.ENVELOPE).withAlpha(0.12), outline: true, outlineColor: Cesium.Color.fromCssColorString(SPECTRAL_CESIUM_COLOURS.ENVELOPE).withAlpha(0.45), height: pp.alt }, properties: { spectral: spectralProperty(Cesium) } });
    primitives.push({ contact_id: defender.id, entityId: id });
  }
  return primitives;
}

export function buildEngagementGeometry(Cesium: CesiumModule, viewer: CesiumViewer, _orders: PCM.Order[], adjudication: PCM.AdjudicationResult, ws: PCM.WorldState): string[] {
  const lineIds: string[] = [];
  const blueById = new Map(ws.blue_force.platforms.map((p) => [p.id, p]));
  for (const [idx, evt] of adjudication.events.entries()) {
    if (evt.type !== 'intercept_success' && evt.type !== 'weapon_release' && evt.type !== 'impact') continue;
    const shooterId = evt.affected_platform_ids[0];
    const shooter = shooterId ? blueById.get(shooterId) : ws.blue_force.platforms[0];
    if (!shooter) continue;
    const from = platformPosition(shooter);
    const to = gridToLatLon('ECHO-7');
    const id = 'spectral-engage-' + evt.event_id + '-' + idx;
    viewer.entities.add({ id, polyline: { positions: Cesium.Cartesian3.fromDegreesArray([from.lon, from.lat, to.lon, to.lat]), width: 2, material: Cesium.Color.fromCssColorString(SPECTRAL_CESIUM_COLOURS.ENGAGEMENT).withAlpha(0.85) }, properties: { spectral: spectralProperty(Cesium) } });
    lineIds.push(id);
  }
  return lineIds;
}

export function buildFogOfWarOverlay(Cesium: CesiumModule, viewer: CesiumViewer, ws: PCM.WorldState, _sensorPicture: PCM.Contact[], role: PlayerGlobeRole): FogOfWarOverlay {
  const blueCoverage: string[] = [];
  const ewDegradationZones: string[] = [];
  if (role === 'red') return { blueCoverage, ewDegradationZones };
  for (const defender of ws.blue_force.platforms) {
    if (defender.status === 'destroyed') continue;
    const rangeKm = resolveDefenderSensorRange(defender, 'radar', defender.sensor ?? 'generic-radar') ?? 25;
    const pp = platformPosition(defender);
    const id = 'spectral-fog-blue-' + defender.id;
    viewer.entities.add({ id, position: Cesium.Cartesian3.fromDegrees(pp.lon, pp.lat, pp.alt), ellipse: { semiMajorAxis: rangeKm * 1000, semiMinorAxis: rangeKm * 1000, material: Cesium.Color.fromCssColorString(SPECTRAL_CESIUM_COLOURS.FOG).withAlpha(0.08), outline: false, height: pp.alt }, properties: { spectral: spectralProperty(Cesium) } });
    blueCoverage.push(id);
  }
  for (const ew of ws.red_force.ew_assets.filter((a) => a.status === 'active')) {
    const pp = gridToLatLon(ew.location_grid);
    const id = 'spectral-fog-ew-' + ew.id;
    viewer.entities.add({ id, position: Cesium.Cartesian3.fromDegrees(pp.lon, pp.lat, 0), ellipse: { semiMajorAxis: ew.effective_radius_km * 1000, semiMinorAxis: ew.effective_radius_km * 1000, material: Cesium.Color.fromCssColorString('#7f1d1d').withAlpha(0.15), outline: true, outlineColor: Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.35) }, properties: { spectral: spectralProperty(Cesium) } });
    ewDegradationZones.push(id);
  }
  return { blueCoverage, ewDegradationZones };
}

export function flyToScenario(Cesium: CesiumModule, viewer: CesiumViewer, ws: PCM.WorldState): void {
  const [w, s, e, n] = computeScenarioBounds(ws);
  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees((w + e) / 2, (s + n) / 2, 85000), duration: 2.5 });
}

function readSpectralTag(ent: { properties?: { spectral?: { getValue?: () => boolean; _v?: unknown } | boolean } }): boolean {
  const spectral = ent.properties?.spectral;
  if (spectral === true) return true;
  if (spectral && typeof spectral === 'object') {
    if ('getValue' in spectral && typeof spectral.getValue === 'function') return spectral.getValue() === true;
    if ('_v' in spectral) return spectral._v === true;
  }
  return false;
}

export function clearSpectralLayers(viewer: CesiumViewer): void {
  const remove: unknown[] = [];
  for (const ent of viewer.entities.values) {
    if (readSpectralTag(ent as never)) remove.push(ent);
  }
  for (const ent of remove) viewer.entities.remove(ent as never);
}

export function computeScenarioBounds(ws: PCM.WorldState): [number, number, number, number] {
  const points = [...ws.blue_force.platforms, ...ws.red_force.platforms].filter((p) => p.status !== 'destroyed').map((p) => gridToLatLon(gridRef(p)));
  if (!points.length) return [10.5, 47.5, 12.5, 49.0];
  const pad = 0.15;
  return [Math.min(...points.map((p) => p.lon)) - pad, Math.min(...points.map((p) => p.lat)) - pad, Math.max(...points.map((p) => p.lon)) + pad, Math.max(...points.map((p) => p.lat)) + pad];
}

export function syncSpectralEntities(Cesium: CesiumModule, viewer: CesiumViewer, ws: PCM.WorldState, sensorPicture: PCM.Contact[], role: PlayerGlobeRole = 'ref') { clearSpectralLayers(viewer); return worldStateToCesiumEntities(Cesium, viewer, ws, sensorPicture, role); }
