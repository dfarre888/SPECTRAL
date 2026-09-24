import type { SensorTrack, WoprPlatform } from '@/lib/wopr/types'

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Fraction of sensor range at which radar or EO/IR finds a target that is not
 * emitting. Planning assumption: a silent target has to be seen or painted,
 * which is shorter-ranged than hearing an emitter.
 */
export const SILENT_TARGET_RANGE_FACTOR = 0.5

/** The active or optical sensor an observer can use against a silent target, if any. */
function activeSensor(p: WoprPlatform): 'radar' | 'eo_ir' | null {
  if (p.sensor === 'radar' || p.sensor === 'eo_ir') return p.sensor
  const t = p.platform_type.toLowerCase()
  if (t.includes('radar')) return 'radar'
  // Legacy scenarios used platform_type 'sigint' as the only observer that
  // could find a silent target. Kept so those scenarios adjudicate as before.
  if (t === 'sigint') return 'radar'
  return null
}

/**
 * Simplified fog of war: an observer holds a target it can sense within range.
 * - An emitting target is heard by any observer within the side's sensor range
 *   (SIGINT, passive RF).
 * - Radar and EO/IR find any target, silent or not, within their own range:
 *   `sensor_range_km` when set, otherwise half the side's sensor range.
 * Positions carry a small jitter so a held track is not ground truth.
 */
export function buildSensorPicture(
  observerPlatforms: WoprPlatform[],
  targetPlatforms: WoprPlatform[],
  sensorRangeKm: number,
  random: () => number = Math.random,
): SensorTrack[] {
  const tracks: SensorTrack[] = []

  for (const observer of observerPlatforms) {
    if (observer.destroyed) continue
    const active = activeSensor(observer)
    const activeRange = observer.sensor_range_km ?? sensorRangeKm * SILENT_TARGET_RANGE_FACTOR
    for (const target of targetPlatforms) {
      if (target.destroyed) continue
      const dist = haversineKm(observer.lat, observer.lon, target.lat, target.lon)

      let range: number
      let source: SensorTrack['source']
      if (target.radiating && dist <= sensorRangeKm) {
        range = sensorRangeKm
        source = 'sigint'
      } else if (active && dist <= activeRange) {
        range = activeRange
        source = active
      } else {
        continue
      }

      tracks.push({
        id: target.id,
        name: target.name,
        lat: target.lat + (random() - 0.5) * 0.002,
        lon: target.lon + (random() - 0.5) * 0.002,
        confidence: dist < range * 0.4 ? 'high' : dist < range * 0.7 ? 'medium' : 'low',
        source,
      })
    }
  }

  const rank = { high: 3, medium: 2, low: 1 } as const
  const byId = new Map<string, SensorTrack>()
  for (const t of tracks) {
    const existing = byId.get(t.id)
    if (!existing || rank[t.confidence] > rank[existing.confidence]) byId.set(t.id, t)
  }
  return [...byId.values()]
}
