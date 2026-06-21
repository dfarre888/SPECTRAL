// SPECTRAL — Risk overlay Cesium entity management
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import { loadCesium } from '@/lib/map/load-cesium'

export const RISK_ANCHOR_ID = 'spectral-risk-anchor'

export interface RiskOverlayRingMeta {
  id: string
  fill: [number, number, number, number]
  outline: [number, number, number, number]
}

export interface RiskOverlayEntities {
  anchor: { id: string }
  rings: RiskOverlayRingMeta[]
}

type RingSpec = {
  id: string
  radius_m: number
  fill: [number, number, number, number]
  outline: [number, number, number, number]
}

/** Cesium ellipses with r≤0 or extreme radii can crash the renderer (RangeError in PVS). */
const MAX_RING_RADIUS_M = 500_000
const MIN_RING_RADIUS_M = 1

function sanitizeRadius(radius_m: number): number | null {
  if (!Number.isFinite(radius_m) || radius_m < MIN_RING_RADIUS_M) return null
  return Math.min(radius_m, MAX_RING_RADIUS_M)
}

function buildRingSpecs(
  entries: Array<{ id: string; radius_m: number; fill: RingSpec['fill']; outline: RingSpec['outline'] }>,
): RingSpec[] {
  const seen = new Set<number>()
  return entries
    .map((e) => {
      const r = sanitizeRadius(e.radius_m)
      if (r === null) return null
      if (seen.has(r)) return null
      seen.add(r)
      return { id: e.id, radius_m: r, fill: e.fill, outline: e.outline }
    })
    .filter((s): s is RingSpec => s !== null)
    .sort((a, b) => b.radius_m - a.radius_m)
}

function addRing(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  lon: number,
  lat: number,
  spec: RingSpec,
) {
  const [fr, fg, fb, fa] = spec.fill
  const [or, og, ob, oa] = spec.outline
  viewer.entities.add({
    id: spec.id,
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    ellipse: {
      semiMinorAxis: spec.radius_m,
      semiMajorAxis: spec.radius_m,
      material: new Cesium.ColorMaterialProperty(
        Cesium.Color.fromBytes(fr, fg, fb, Math.round(fa * 255)),
      ),
      outline: true,
      outlineColor: Cesium.Color.fromBytes(or, og, ob, Math.round(oa * 255)),
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      classificationType: Cesium.ClassificationType.TERRAIN,
    },
  })
  return { id: spec.id, fill: spec.fill, outline: spec.outline }
}

function addAnchor(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  lon: number,
  lat: number,
  label: string,
) {
  viewer.entities.add({
    id: RISK_ANCHOR_ID,
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    billboard: {
      image: buildCrosshairDataUri(),
      width: 32,
      height: 32,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: label,
      font: '11px JetBrains Mono, monospace',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -28),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
  return { id: RISK_ANCHOR_ID }
}

function buildCrosshairDataUri(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="none" stroke="#F97316" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="30" stroke="#F97316" stroke-width="2"/><line x1="2" y1="16" x2="30" y2="16" stroke="#F97316" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="#06B6D4"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export async function addBlastOverlay(
  viewer: CesiumViewer,
  lon: number,
  lat: number,
  rings: { lethal_m: number; injury_m: number; structural_m: number; hazard_m: number },
  label: string,
): Promise<RiskOverlayEntities> {
  const Cesium = await loadCesium()
  const specs = buildRingSpecs([
    { id: 'spectral-risk-hazard', radius_m: rings.hazard_m, fill: [59, 130, 246, 0.1], outline: [59, 130, 246, 1] },
    { id: 'spectral-risk-structural', radius_m: rings.structural_m, fill: [234, 179, 8, 0.15], outline: [234, 179, 8, 1] },
    { id: 'spectral-risk-injury', radius_m: rings.injury_m, fill: [249, 115, 22, 0.2], outline: [249, 115, 22, 1] },
    { id: 'spectral-risk-lethal', radius_m: rings.lethal_m, fill: [239, 68, 68, 0.25], outline: [239, 68, 68, 1] },
  ])
  const ringEntities = specs.map((s) => addRing(Cesium, viewer, lon, lat, s))
  const anchor = addAnchor(Cesium, viewer, lon, lat, label)
  viewer.scene?.requestRender?.()
  return { anchor, rings: ringEntities }
}

export async function addJammingOverlay(
  viewer: CesiumViewer,
  lon: number,
  lat: number,
  gps_m: number,
  rc_m: number,
  max_m: number,
  label: string,
): Promise<RiskOverlayEntities> {
  const Cesium = await loadCesium()
  // Draw outer→inner; skip r=0 (GNSS-only jammers have no RC band) and dedupe when max===gps.
  const specs = buildRingSpecs([
    { id: 'spectral-risk-jam-max', radius_m: max_m, fill: [234, 179, 8, 0.1], outline: [234, 179, 8, 1] },
    { id: 'spectral-risk-jam-rc', radius_m: rc_m, fill: [249, 115, 22, 0.15], outline: [249, 115, 22, 1] },
    { id: 'spectral-risk-jam-gps', radius_m: gps_m, fill: [239, 68, 68, 0.2], outline: [239, 68, 68, 1] },
  ])
  const ringEntities = specs.map((s) => addRing(Cesium, viewer, lon, lat, s))
  const anchor = addAnchor(Cesium, viewer, lon, lat, label)
  viewer.scene?.requestRender?.()
  return { anchor, rings: ringEntities }
}

export async function moveRiskOverlay(
  viewer: CesiumViewer,
  entities: RiskOverlayEntities,
  lon: number,
  lat: number,
): Promise<void> {
  const Cesium = await loadCesium()
  const pos = Cesium.Cartesian3.fromDegrees(lon, lat)
  const anchor = viewer.entities.getById(entities.anchor.id)
  if (anchor) anchor.position = new Cesium.ConstantPositionProperty(pos)
  for (const ring of entities.rings) {
    const entity = viewer.entities.getById(ring.id)
    if (entity) entity.position = new Cesium.ConstantPositionProperty(pos)
  }
  viewer.scene?.requestRender?.()
}

export function removeRiskOverlay(viewer: CesiumViewer, entities: RiskOverlayEntities): void {
  const ids = [entities.anchor.id, ...entities.rings.map((r) => r.id)]
  for (const id of ids) {
    const entity = viewer.entities.getById(id)
    if (entity) viewer.entities.remove(entity)
  }
  viewer.scene?.requestRender?.()
}

/** Scale ring fill opacity (5–100%); outline stays at design alpha. */
export async function updateRiskOverlayOpacity(
  viewer: CesiumViewer,
  entities: RiskOverlayEntities,
  shadePercent: number,
): Promise<void> {
  const Cesium = await loadCesium()
  const scale = Math.max(0, Math.min(100, shadePercent)) / 100
  for (const ring of entities.rings) {
    const entity = viewer.entities.getById(ring.id)
    if (!entity?.ellipse) continue
    const [r, g, b, baseA] = ring.fill
    const [or, og, ob, oa] = ring.outline
    entity.ellipse.material = new Cesium.ColorMaterialProperty(
      Cesium.Color.fromBytes(r, g, b, Math.round(baseA * scale * 255)),
    )
    entity.ellipse.outlineColor = Cesium.Color.fromBytes(or, og, ob, Math.round(oa * 255))
  }
  viewer.scene?.requestRender?.()
}
