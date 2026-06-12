'use client'

import { useEffect, useRef, useState } from 'react'
import { buildOverlapVolume, detectOverlapPairs } from '@/lib/map/overlap'
import type { OverlapVolume, PlacedCuas, PlacedUas } from '@/lib/map/types'

interface DefeatCheckResult {
  effectiveness_pct: number
  is_immune: boolean
  kind: string
}

export function useDefeatOverlap(placedUas: PlacedUas[], placedCuas: PlacedCuas[]) {
  const [overlaps, setOverlaps] = useState<OverlapVolume[]>([])
  const runRef = useRef(0)

  useEffect(() => {
    if (placedUas.length === 0 || placedCuas.length === 0) {
      setOverlaps([])
      return
    }

    const pairs = detectOverlapPairs(placedUas, placedCuas)
    if (pairs.length === 0) {
      setOverlaps([])
      return
    }

    const runId = ++runRef.current

    ;(async () => {
      const volumes: OverlapVolume[] = []

      await Promise.all(
        pairs.map(async ({ uas, cuas }) => {
          try {
            const res = await fetch(
              `/api/defeat-check?uas_id=${encodeURIComponent(uas.asset.id)}&cuas_id=${encodeURIComponent(cuas.asset.id)}`
            )
            if (!res.ok) return
            const json = (await res.json()) as { data: DefeatCheckResult }
            volumes.push(
              buildOverlapVolume(
                uas,
                cuas,
                json.data.effectiveness_pct ?? 50,
                json.data.is_immune
              )
            )
          } catch {
            volumes.push(buildOverlapVolume(uas, cuas, 50, false))
          }
        })
      )

      if (runId !== runRef.current) return
      setOverlaps(volumes)
    })()
  }, [placedUas, placedCuas])

  return overlaps
}
