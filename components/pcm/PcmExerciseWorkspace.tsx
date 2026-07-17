'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { TurnControlPanel } from '@/components/pcm/TurnControlPanel'
import { GlobeSkeleton } from '@/components/ui/loading-skeleton'

const SpectralGlobe = dynamic(() => import('@/components/pcm/SpectralGlobe'), {
  ssr: false,
  loading: () => <GlobeSkeleton className="h-full min-h-[320px]" />,
})

export function PcmExerciseWorkspace({ exerciseId }: { exerciseId: string }) {
  const [meta, setMeta] = useState<{ status: string; current_turn: number; training?: boolean } | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refreshMeta = useCallback(() => {
    fetch(`/api/spectral/exercises/${exerciseId}`)
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json()
          if (data?.error || typeof data?.current_turn !== 'number') return null
          return {
            status: String(data.status ?? 'unknown'),
            current_turn: data.current_turn as number,
            training: false,
          }
        }
        const trainingRes = await fetch(`/api/v1/training/exercise/${exerciseId}`)
        if (!trainingRes.ok) return null
        const data = await trainingRes.json()
        return {
          status: String(data.status ?? 'active'),
          current_turn: data.current_turn as number,
          training: true,
        }
      })
      .then((next) => {
        setMeta(next)
        setLoaded(true)
      })
      .catch(() => {
        setMeta(null)
        setLoaded(true)
      })
  }, [exerciseId])

  useEffect(() => {
    refreshMeta()
  }, [refreshMeta])

  return (
    <HubPageShell
      eyebrow="PCM Exercise"
      title={
        !loaded
          ? 'Loading exercise…'
          : meta
            ? `Turn ${meta.current_turn}`
            : 'Exercise unavailable'
      }
      subtitle={
        meta?.training
          ? 'OSINT training fixture — Kyiv OWA intercept vignette (Turn 12 snapshot).'
          : meta
            ? 'Live globe — fog of war, detection envelopes, engagement geometry.'
            : loaded
              ? 'Start an exercise from Scenario Generator or sign in if this session expired.'
              : 'Fetching exercise metadata…'
      }
      headerAction={
        meta ? (
          <Link
            href={`/pcm/exercise/${exerciseId}/aar`}
            className="text-xs font-mono text-[var(--store-accent)] hover:underline"
          >
            View AAR
          </Link>
        ) : loaded ? (
          <Link href="/pcm/scenario" className="store-btn-primary px-3 py-1.5 text-xs font-semibold">
            New exercise
          </Link>
        ) : null
      }
    >
      <TurnControlPanel
        exerciseId={exerciseId}
        currentTurn={meta?.current_turn ?? 0}
        status={meta?.status ?? (loaded ? 'unavailable' : 'loading')}
        training={meta?.training}
        onTurnAdvanced={refreshMeta}
      />
      <div className="h-[min(72vh,720px)] rounded-xl overflow-hidden border border-[var(--store-line)]">
        <SpectralGlobe exerciseId={exerciseId} playerRole="ref" />
      </div>
    </HubPageShell>
  )
}
