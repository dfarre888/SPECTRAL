'use client'

import { useRouter } from 'next/navigation'
import { X, GitCompare } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-surf1 border border-border rounded-lg px-4 py-3 shadow-lg max-w-2xl w-[calc(100%-2rem)]">
      <GitCompare className="h-4 w-4 text-orange flex-shrink-0" />
      <div className="flex flex-wrap gap-2 flex-1 min-w-0">
        {selected.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1 bg-surf2 border border-border rounded px-2 py-1 text-xs font-mono text-t-primary"
          >
            {p.name}
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="text-t-muted hover:text-t-primary"
              aria-label={`Remove ${p.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Button size="sm" onClick={handleCompare}>
        Compare ({ids.length})
      </Button>
      <Button variant="ghost" size="sm" onClick={clear}>
        Clear
      </Button>
    </div>
  )
}
