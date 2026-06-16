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

  if (!tile) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${tile.band} band detail`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close band detail"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--store-line)] bg-[#0A0A0F] p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-2 mb-3">
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
        <TileCard
          tile={tile}
          expanded
          onExpand={onClose}
          emissions={emissions}
          compact={false}
        />
      </div>
    </div>
  )
}
