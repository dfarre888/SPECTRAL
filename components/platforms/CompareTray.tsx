'use client'

import { useRouter } from 'next/navigation'
import { X, GitCompare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { useCompareStore } from '@/lib/stores/compare-store'
import type { Platform } from '@/lib/types'

interface CompareTrayProps {
  platforms: Platform[]
}

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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 store-panel rounded-2xl px-4 py-3 shadow-lg max-w-2xl w-[calc(100%-2rem)]">
      <GitCompare className="h-4 w-4 text-[var(--store-accent)] flex-shrink-0" />
      <div className="flex flex-wrap gap-2 flex-1 min-w-0">
        {selected.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 store-panel-inner rounded-lg px-2 py-1 text-xs store-text-body"
          >
            <PlatformThumbnail id={p.id} name={p.name} size="xs" rounded="sm" />
            {p.name}
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="store-text-muted hover:text-white"
              aria-label={`Remove ${p.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Button size="sm" onClick={handleCompare} className="store-btn-primary shrink-0">
        Compare
      </Button>
      <Button size="sm" variant="ghost" onClick={clear} className="shrink-0">
        Clear
      </Button>
    </div>
  )
}
