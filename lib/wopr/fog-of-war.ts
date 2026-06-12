import type { SensorTrack, WoprPlatform } from '@/lib/wopr/types'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
 * Simplified fog-of-war: observer detects platforms within sensor range.
 * SIGINT only if target is radiating.
 */
export function buildSensorPicture(
  observerPlatforms: WoprPlatform[],
  targetPlatforms: WoprPlatform[],
  sensorRangeKm: number,
): SensorTrack[] {
  const tracks: SensorTrack[] = []

  for (const observer of observerPlatforms) {
    if (observer.destroyed) continue
    for (const target of targetPlatforms) {
      if (target.destroyed) continue
      const dist = haversineKm(observer.lat, observer.lon, target.lat, target.lon)
      if (dist > sensorRangeKm) continue

      const sigintOnly = !target.radiating
      if (sigintOnly && observer.platform_type !== 'sigint') continue

      tracks.push({
        id: target.id,
        name: target.name,
        lat: target.lat + (Math.random() - 0.5) * 0.002,
        lon: target.lon + (Math.random() - 0.5) * 0.002,
        confidence: dist < sensorRangeKm * 0.4 ? 'high' : dist < sensorRangeKm * 0.7 ? 'medium' : 'low',
        source: target.radiating ? 'sigint' : 'radar',
      })
    }
  }

  const byId = new Map<string, SensorTrack>()
  for (const t of tracks) {
    const existing = byId.get(t.id)
    if (!existing || t.confidence === 'high') byId.set(t.id, t)
  }
  return [...byId.values()]
}
