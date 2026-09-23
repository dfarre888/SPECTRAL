'use client'

import { useRouter } from 'next/navigation'
import { X, GitCompare } from 'lucide-react'
import { MAX_COMPARE_PLATFORMS, useCompareStore } from '@/lib/stores/compare-store'
import type { Platform } from '@/lib/types'

interface CompareTrayProps {
  platforms: Platform[]
}

/**
 * Floating compare tray. It sits over content, so it is Liquid Glass (a
 * control layer), not lacquer.
 */
export function CompareTray({ platforms }: CompareTrayProps) {
  const router = useRouter()
  const { ids, remove, clear } = useCompareStore()

  if (ids.length === 0) return null

  const selected = ids
    .map((id) => platforms.find((p) => p.id === id))
    .filter(Boolean) as Platform[]

  const handleCompare = () => {
    router.push(`/compare?ids=${ids.join(',')}`)
  }

  return (
    <div
      role="region"
      aria-label="Compare tray"
      className="lg-glass fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-3 py-2.5 max-w-3xl w-[calc(100%-2rem)] md:w-auto"
    >
      <span className="hidden sm:inline-flex items-center gap-2 pl-1 pr-1 text-[12px] store-text-muted shrink-0">
        <GitCompare className="h-4 w-4 text-[var(--wb-blue)]" aria-hidden />
        <span className="font-mono tabular-nums">
          {ids.length}/{MAX_COMPARE_PLATFORMS}
        </span>
      </span>
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {selected.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 max-w-[220px] h-8 pl-3 pr-1.5 rounded-full text-[12.5px] text-[var(--store-ink)] bg-[rgba(255,255,255,0.06)] border border-[var(--glass-line)]"
            title={p.name}
          >
            <span className="truncate">{p.name}</span>
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="grid place-items-center w-5 h-5 rounded-full store-text-muted hover:text-white hover:bg-[rgba(255,255,255,0.1)] shrink-0"
              aria-label={`Remove ${p.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <button type="button" onClick={clear} className="fc-action shrink-0 px-1">
        Clear
      </button>
      <button type="button" onClick={handleCompare} className="btn-glass primary shrink-0">
        Compare
      </button>
    </div>
  )
}
