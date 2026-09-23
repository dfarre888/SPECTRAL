'use client'

import { useEffect, useRef, useState } from 'react'
import { Plane } from 'lucide-react'
import { PlatformCard } from '@/components/platforms/PlatformCard'
import type { Platform } from '@/lib/types'

interface PlatformGridProps {
  platforms: Platform[]
}

/** Cards rendered per batch. The rest arrive as the sentinel nears the viewport. */
const BATCH = 36

export function PlatformGrid({ platforms }: PlatformGridProps) {
  const [count, setCount] = useState(BATCH)
  const sentinel = useRef<HTMLDivElement | null>(null)

  // A new filter result starts again from the first batch.
  useEffect(() => {
    setCount(BATCH)
  }, [platforms])

  useEffect(() => {
    const el = sentinel.current
    if (!el || count >= platforms.length) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => Math.min(platforms.length, c + BATCH))
        }
      },
      { rootMargin: '900px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [count, platforms.length])

  if (platforms.length === 0) {
    return (
      <div className="store-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <Plane className="h-10 w-10 store-text-muted mb-4 opacity-40" />
        <p className="font-semibold text-lg text-white mb-1">No platforms match</p>
        <p className="text-sm store-text-body">Try a different category or clear the search.</p>
      </div>
    )
  }

  const shown = platforms.slice(0, count)

  return (
    <>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
      >
        {shown.map((platform, index) => (
          <PlatformCard key={platform.id} platform={platform} index={index} />
        ))}
      </div>
      {count < platforms.length ? (
        <div ref={sentinel} className="flex flex-col items-center gap-3 pt-8 pb-4">
          <span className="text-[12px] font-mono tabular-nums store-text-muted">
            {count} of {platforms.length}
          </span>
          <button
            type="button"
            className="btn-glass"
            onClick={() => setCount((c) => Math.min(platforms.length, c + BATCH * 2))}
          >
            Show more
          </button>
        </div>
      ) : null}
    </>
  )
}

export function PlatformGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-72 rounded-xl store-panel animate-pulse" />
      <div className="dt-frame">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-12 border-b border-[rgba(255,255,255,0.055)] last:border-0 animate-pulse"
            style={{ background: i % 2 ? '#0A0A0C' : '#030304' }}
          />
        ))}
      </div>
    </div>
  )
}
