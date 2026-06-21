'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { HubPageShell } from '@/components/hub/HubPageShell'

const SpectralGlobe = dynamic(() => import('@/components/pcm/SpectralGlobe'), { ssr: false })

export function PcmExerciseWorkspace({ exerciseId }: { exerciseId: string }) {
  const [meta, setMeta] = useState<{ status: string; current_turn: number } | null>(null)
  useEffect(() => {
    fetch(`/api/spectral/exercises/${exerciseId}`)
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => setMeta(null))
  }, [exerciseId])

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
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--store-line)] bg-black/30 px-3 py-2">
        <span className="text-[10px] font-mono text-white/60">Turn controls (stub)</span>
        <button type="button" disabled className="rounded border border-white/20 px-2 py-1 text-[10px] font-mono text-white/50">Submit orders</button>
        <button type="button" disabled className="rounded border border-white/20 px-2 py-1 text-[10px] font-mono text-white/50">Advance turn</button>
        <span className="font-mono text-[10px] text-[var(--store-accent)]">{meta?.status ?? '—'}</span>
      </div>
      <div className="h-[min(72vh,720px)] rounded-xl overflow-hidden border border-[var(--store-line)]">
        <SpectralGlobe exerciseId={exerciseId} playerRole="ref" />
      </div>
    </HubPageShell>
  )
}
