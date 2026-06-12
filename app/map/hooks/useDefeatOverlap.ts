'use client'

import { useEffect, useRef, useState } from 'react'
import { buildOverlapVolume, detectOverlapPairs } from '@/lib/map/overlap'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import type { OverlapVolume, PlacedCuas, PlacedUas } from '@/lib/map/types'

interface DefeatCheckResult {
  effectiveness_pct: number
  is_immune: boolean
  kind: string
}

export function useDefeatOverlap(placedUas: PlacedUas[], placedCuas: PlacedCuas[]) {
  const [overlaps, setOverlaps] = useState<OverlapVolume[]>([])
  const [source, setSource] = useState<'defeat-check' | 'adjudication' | 'geometry'>('geometry')
  const runRef = useRef(0)

  useEffect(() => {
    if (placedUas.length === 0 || placedCuas.length === 0) {
      setOverlaps([])
      setSource('geometry')
      return
    }

    const pairs = detectOverlapPairs(placedUas, placedCuas)
    if (pairs.length === 0) {
      setOverlaps([])
      setSource('geometry')
      return
    }

    const runId = ++runRef.current

    ;(async () => {
      if (isOperationsEditionClient()) {
        const adjudicationPairs = pairs.map(({ uas, cuas }) => ({
          uas: {
            instanceId: uas.instanceId,
            asset: uas.asset,
            lat: uas.lat,
            lon: uas.lon,
            discAltitude_m: uas.discAltitude_m,
            terrainAMSL: uas.terrainAMSL,
          },
          cuas: {
            instanceId: cuas.instanceId,
            asset: cuas.asset,
            lat: cuas.lat,
            lon: cuas.lon,
            terrainAMSL: cuas.terrainAMSL,
          },
          defeatMatrixPk: null,
          inDefeatRange: true,
          terrainMasked: cuas.hasTerrainMasking,
          tenantId: 'client',
        }))

        try {
          const res = await fetch('/api/v1/adjudication/laydown', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pairs: adjudicationPairs }),
          })
          if (res.ok) {
            const json = (await res.json()) as {
              data: { uasInstanceId: string; cuasInstanceId: string; combinedBlueSuccessPct: number }[]
            }
            const byKey = new Map(
              json.data.map((a) => [`${a.uasInstanceId}:${a.cuasInstanceId}`, a]),
            )
            const volumes = pairs.map(({ uas, cuas }) => {
              const adj = byKey.get(`${uas.instanceId}:${cuas.instanceId}`)
              const pct = adj?.combinedBlueSuccessPct ?? 50
              return buildOverlapVolume(uas, cuas, pct, false)
            })
            if (runId === runRef.current) {
              setOverlaps(volumes)
              setSource('adjudication')
            }
            return
          }
        } catch {
          // fall through to defeat-check
        }
      }

      const volumes: OverlapVolume[] = []
      await Promise.all(
        pairs.map(async ({ uas, cuas }) => {
          try {
            const res = await fetch(
              `/api/defeat-check?uas_id=${encodeURIComponent(uas.asset.id)}&cuas_id=${encodeURIComponent(cuas.asset.id)}`,
            )
            if (!res.ok) return
            const json = (await res.json()) as { data: DefeatCheckResult }
            if (json.data.kind === 'empty') return
            volumes.push(
              buildOverlapVolume(
                uas,
                cuas,
                json.data.effectiveness_pct ?? 50,
                json.data.is_immune,
              ),
            )
          } catch {
            volumes.push(buildOverlapVolume(uas, cuas, 50, false))
          }
        }),
      )

      if (runId !== runRef.current) return
      setOverlaps(volumes)
      setSource(isOperationsEditionClient() ? 'defeat-check' : 'defeat-check')
    })()
  }, [placedUas, placedCuas])

  return { overlaps, source }
}
