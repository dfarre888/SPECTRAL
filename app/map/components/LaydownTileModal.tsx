'use client'

import { useCallback, useEffect, useState } from 'react'
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
  const [showRed, setShowRed] = useState(true)
  const [showBlue, setShowBlue] = useState(true)

  const handleClose = useCallback(() => {
    setShowRed(true)
    setShowBlue(true)
    onClose()
  }, [onClose])

  useEffect(() => {
    setShowRed(true)
    setShowBlue(true)
  }, [tile?.id])

  useEffect(() => {
    if (!tile) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tile, handleClose])

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRed((v) => !v)}
              style={{
                fontFamily: 'var(--sx-mono, monospace)',
                fontSize: 9,
                letterSpacing: '0.1em',
                padding: '4px 10px',
                borderRadius: 6,
                border: showRed
                  ? '1px solid rgba(248,113,113,0.65)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: showRed ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.03)',
                color: showRed ? 'rgba(248,113,113,0.95)' : 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Red
            </button>
            <button
              type="button"
              onClick={() => setShowBlue((v) => !v)}
              style={{
                fontFamily: 'var(--sx-mono, monospace)',
                fontSize: 9,
                letterSpacing: '0.1em',
                padding: '4px 10px',
                borderRadius: 6,
                border: showBlue
                  ? '1px solid rgba(74,158,255,0.65)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: showBlue ? 'rgba(74,158,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: showBlue ? 'rgba(74,158,255,0.95)' : 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Blue
            </button>
          </div>
          <button
            type="button"
            onClick={handleClose}
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
            onExpand={handleClose}
            stacked
            showRed={showRed}
            showBlue={showBlue}
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
