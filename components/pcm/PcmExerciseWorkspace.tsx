'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { TurnControlPanel } from '@/components/pcm/TurnControlPanel'

const SpectralGlobe = dynamic(() => import('@/components/pcm/SpectralGlobe'), { ssr: false })

export function PcmExerciseWorkspace({ exerciseId }: { exerciseId: string }) {
  const [meta, setMeta] = useState<{ status: string; current_turn: number } | null>(null)

  const refreshMeta = useCallback(() => {
    fetch(`/api/spectral/exercises/${exerciseId}`)
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => setMeta(null))
  }, [exerciseId])

  useEffect(() => {
    refreshMeta()
  }, [refreshMeta])

  return (
    <HubPageShell
      eyebrow="PCM Exercise"
      title={meta ? `Turn ${meta.current_turn}` : 'Loading exercise…'}
      subtitle="Live globe — fog of war, detection envelopes, engagement geometry."
      headerAction={
        <Link href={`/pcm/exercise/${exerciseId}/aar`} className="text-xs font-mono text-[var(--store-accent)] hover:underline">
          View AAR
        </Link>
      }
    >
      <TurnControlPanel
        exerciseId={exerciseId}
        currentTurn={meta?.current_turn ?? 0}
        status={meta?.status ?? 'loading'}
        onTurnAdvanced={refreshMeta}
      />
      <div className="h-[min(72vh,720px)] rounded-xl overflow-hidden border border-[var(--store-line)]">
        <SpectralGlobe exerciseId={exerciseId} playerRole="ref" />
      </div>
    </HubPageShell>
  )
}
