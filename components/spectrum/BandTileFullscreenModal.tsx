'use client'

/**
 * Full-screen band tile viewer — used by Spectrum Workspace (catalog) and Map Intel laydown.
 * Callers: BandTileGrid DefaultBandTileGrid, LaydownTileModal wrapper.
 * User request: tile click should open screen-sized display.
 */
import { useCallback, useEffect, useState } from 'react'
import { TileCard } from '@/components/spectrum/BandTileGrid'
import type { BandTile } from '@/components/spectrum/band-tile-data'
import type { LaydownEmission } from '@/lib/map/laydown-tiles'
import { SpectrumPulseLegend } from '@/components/spectrum/SpectrumPulseOverlay'
import { X } from 'lucide-react'

export interface BandTileFullscreenModalProps {
  tile: BandTile | null
  emissions?: LaydownEmission[]
  onClose: () => void
  variant?: 'laydown' | 'catalog'
}

export function BandTileFullscreenModal({
  tile,
  emissions = [],
  onClose,
  variant = 'catalog',
}: BandTileFullscreenModalProps) {
  const [showRed, setShowRed] = useState(true)
  const [showBlue, setShowBlue] = useState(true)
  const hasEmissions = emissions.length > 0

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

  const title =
    variant === 'laydown'
      ? `Laydown EW band — ${tile.band}`
      : `${tile.band} — ${tile.range}`

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[var(--store-bg)]"
      role="dialog"
      aria-modal="true"
      aria-label={`${tile.band} band detail`}
    >
      <div className="relative z-10 flex flex-col flex-1 min-h-0 p-3 pt-4">
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--store-accent)]">
              {title}
            </p>
            {variant === 'catalog' && (
              <p className="text-[11px] store-text-muted mt-0.5 max-w-xl">{tile.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {hasEmissions && (
              <>
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
                  {showRed ? 'Hide red (threat)' : 'Show red (threat)'}
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
                  {showBlue ? 'Hide blue (defence)' : 'Show blue (defence)'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg store-text-muted hover:text-white hover:bg-white/5"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {hasEmissions && <SpectrumPulseLegend />}
        <div className="flex flex-col flex-1 min-h-0">
          <TileCard
            tile={tile}
            expanded
            onExpand={handleClose}
            stacked={hasEmissions}
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
