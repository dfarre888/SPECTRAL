'use client'

import { useEffect } from 'react'
import { TileCard } from '@/components/spectrum/BandTileGrid'
import type { BandTile } from '@/components/spectrum/band-tile-data'
import type { LaydownEmission } from '@/lib/map/laydown-tiles'
import { SpectrumPulseLegend } from '@/components/spectrum/SpectrumPulseOverlay'
import { X } from 'lucide-react'

interface LaydownTileModalProps {
  tile: BandTile | null
  emissions: LaydownEmission[]
  onClose: () => void
}

export function LaydownTileModal({ tile, emissions, onClose }: LaydownTileModalProps) {
  useEffect(() => {
    if (!tile) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tile, onClose])

  useEffect(() => {
    if (!tile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [tile])

  if (!tile) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#0A0A0F]"
      role="dialog"
      aria-modal="true"
      aria-label={`${tile.band} band detail`}
    >
      <div className="relative z-10 flex flex-col flex-1 min-h-0 p-3 pt-4">
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--store-accent)]">
            Laydown EW band — {tile.band}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg store-text-muted hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <SpectrumPulseLegend />
        <div className="flex flex-col flex-1 min-h-0">
          <TileCard
            tile={tile}
            expanded
            onExpand={onClose}
            emissions={emissions}
            compact={false}
            fillViewport
            spectrumPulseProminent
          />
        </div>
      </div>
    </div>
  )
}
