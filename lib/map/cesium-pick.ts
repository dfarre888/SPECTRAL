import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import {
  missionSegmentPickEntityId,
  parseMissionSegmentEntityId,
  parseMissionWaypointEntityId,
} from '@/lib/map/mission-path-planner'
import type { PlacedUas } from '@/lib/map/types'

/** Resolve a Cesium scene.pick / drillPick result to a map entity id string. */
export function entityIdFromPick(picked: unknown): string | undefined {
  if (!picked || typeof picked !== 'object') return undefined
  const id = (picked as { id?: { id?: string } | string }).id
  if (typeof id === 'string') return id
  if (id && typeof id === 'object' && typeof id.id === 'string') return id.id
  return undefined
}

export function isMissionPathEntityId(entityId: string): boolean {
  return (
    entityId.startsWith('map-mission-seg-') ||
    entityId.startsWith('map-mission-pick-') ||
    entityId.startsWith('map-mission-wp-')
  )
}

export function uasInstanceFromMissionEntity(entityId: string): string | null {
  const seg = parseMissionSegmentEntityId(entityId)
  if (seg) return seg.uasInstanceId
  const wp = parseMissionWaypointEntityId(entityId)
  if (wp) return wp.uasInstanceId
  return null
}

function screenDistancePx(
  Cesium: CesiumModule,
  scene: CesiumViewer['scene'],
  click: { x: number; y: number },
  lon: number,
  lat: number,
  alt_m: number,
): number | null {
  const cartesian = Cesium.Cartesian3.fromDegrees(lon, lat, alt_m)
  const window = Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, cartesian)
  if (!window) return null
  const dx = window.x - click.x
  const dy = window.y - click.y
  return Math.hypot(dx, dy)
}

function pickMissionPathByScreenProximity(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  position: any,
  placedUas: PlacedUas[],
  maxPixelDistance: number,
): string | undefined {
  const scene = viewer.scene
  let best: { entityId: string; dist: number } | null = null

  for (const uas of placedUas) {
    const mission = uas.mission
    if (!mission || mission.waypoints.length < 2) continue

    for (let i = 0; i < mission.waypoints.length - 1; i++) {
      const prev = mission.waypoints[i]
      const cur = mission.waypoints[i + 1]
      const samples = 12
      for (let s = 0; s <= samples; s++) {
        const t = s / samples
        const lon = prev.lon + (cur.lon - prev.lon) * t
        const lat = prev.lat + (cur.lat - prev.lat) * t
        const alt = prev.alt_m + (cur.alt_m - prev.alt_m) * t
        const dist = screenDistancePx(Cesium, scene, position, lon, lat, alt)
        if (dist == null || dist > maxPixelDistance) continue
        const entityId = missionSegmentPickEntityId(uas.instanceId, i)
        if (!best || dist < best.dist) best = { entityId, dist }
      }
    }
  }

  return best?.entityId
}

/**
 * Pick a map entity at screen position. When preferMission is set, drillPick scans
 * through translucent defeat envelopes to reach mission segment / waypoint polylines.
 * Falls back to screen-space proximity against the mission polyline in edit mode.
 */
export function pickEntityIdAt(
  viewer: CesiumViewer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  position: any,
  options?: {
    preferMission?: boolean
    Cesium?: CesiumModule
    placedUas?: PlacedUas[]
    maxPixelDistance?: number
  },
): string | undefined {
  const preferMission = options?.preferMission ?? false
  if (!preferMission) {
    return entityIdFromPick(viewer.scene.pick(position))
  }

  const picks = viewer.scene.drillPick(position, 32)
  for (const picked of picks) {
    const entityId = entityIdFromPick(picked)
    if (entityId && isMissionPathEntityId(entityId)) return entityId
  }

  for (const picked of picks) {
    const entityId = entityIdFromPick(picked)
    if (entityId) return entityId
  }

  const Cesium = options?.Cesium
  const placedUas = options?.placedUas
  if (Cesium && placedUas?.length) {
    const fallback = pickMissionPathByScreenProximity(
      Cesium,
      viewer,
      position,
      placedUas,
      options.maxPixelDistance ?? 48,
    )
    if (fallback) return fallback
  }

  return undefined
}
