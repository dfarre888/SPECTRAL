'use client'

import { useCallback, useEffect, useState } from 'react'
import { computePlatformRangeEnvelope } from '@/lib/map/range-declaration'
import type { PlacedUas, WindSample } from '@/lib/map/types'

export function useWindData(
  nilWind: boolean,
  placedUas: PlacedUas[],
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>
) {
  const [windByUas, setWindByUas] = useState<Record<string, WindSample>>({})
  const [loading, setLoading] = useState(false)

  const fetchWindForUas = useCallback(async (uas: PlacedUas) => {
    const res = await fetch('/api/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: uas.lat, lon: uas.lon }),
    })
    if (!res.ok) throw new Error('Weather fetch failed')
    const json = (await res.json()) as { data: WindSample }
    return json.data
  }, [])

  const uasKey = placedUas
    .map((u) => `${u.instanceId}:${u.lon}:${u.lat}`)
    .join('|')

  useEffect(() => {
    if (nilWind) {
      setWindByUas({})
      setPlacedUas((prev) =>
        prev.map((u) => {
          const env = computePlatformRangeEnvelope(u.asset, u.terrainAMSL)
          return {
            ...u,
            effectiveRange_km: env.effectiveRangeKm,
            lateralRadius_m: env.sphereRadiusM,
            discAltitude_m: env.discAltitudeM,
          }
        })
      )
      return
    }

    if (placedUas.length === 0) {
      setWindByUas({})
      return
    }

    let cancelled = false
    setLoading(true)

    ;(async () => {
      const next: Record<string, WindSample> = {}
      for (const uas of placedUas) {
        try {
          next[uas.instanceId] = await fetchWindForUas(uas)
        } catch {
          next[uas.instanceId] = { windSpeed_kmh: 0, windDir_deg: 0, level: 'fallback' }
        }
      }
      if (cancelled) return

      setWindByUas(next)
      setPlacedUas((prev) =>
        prev.map((u) => {
          const wind = next[u.instanceId]
          if (!wind) return u
          // Bearing from launch point to loiter point (N=0°, clockwise).
          // atan2(Δlon, Δlat) is the correct flat-earth bearing formula.
          // Previous code had args swapped and +180 which inverted the heading.
          const bearing =
            u.loiter != null
              ? Math.atan2(u.loiter.lon - u.lon, u.loiter.lat - u.lat) *
                  (180 / Math.PI)
              : 0
          const env = computePlatformRangeEnvelope(u.asset, u.terrainAMSL, {
            wind,
            flightBearingDeg: bearing,
            applyWind: true,
          })
          return {
            ...u,
            effectiveRange_km: env.effectiveRangeKm,
            lateralRadius_m: env.sphereRadiusM,
            discAltitude_m: env.discAltitudeM,
          }
        })
      )
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nilWind, uasKey, fetchWindForUas, setPlacedUas])

  return { windByUas, loading }
}
