'use client'

import { useMemo } from 'react'
import {
  computeTileSpectrumZones,
  emissionClipInTile,
  emissionsForTile,
  spectrumZoneStyle,
  LAYDOWN_TILE_VB_W,
  type LaydownEmission,
} from '@/lib/map/laydown-tiles'
import { makeLogScale } from '@/lib/spectrum/scale'
import type { BandTile } from './band-tile-data'

export interface SpectrumPulseOverlayProps {
  tile: BandTile
  emissions: LaydownEmission[]
  showPulse?: boolean
  prominent?: boolean
  stacked?: boolean
}

function platformEmissionHighlights(
  tile: BandTile,
  emissions: LaydownEmission[],
  prominent: boolean,
) {
  const inTile = emissionsForTile(tile, emissions).filter(
    (e) => e.kind === 'uas' || e.kind === 'cuas' || e.kind === 'radar' || e.kind === 'effector',
  )
  if (inTile.length === 0) return null

  const scale = makeLogScale([tile.lo, tile.hi], [30, LAYDOWN_TILE_VB_W - 30])
  const topPct = (tile.rowTopY / tile.viewBoxH) * 100
  const heightPct = ((tile.rowBotY + tile.rowH - tile.rowTopY) / tile.viewBoxH) * 100

  return (
    <>
      {inTile.map((em) => {
        const clip = emissionClipInTile(em, tile)
        if (!clip) return null
        const x0 = scale(clip.lo)
        const x1 = scale(Math.max(clip.hi, clip.lo * 1.001))
        const leftPct = (x0 / LAYDOWN_TILE_VB_W) * 100
        const widthPct = Math.max(((x1 - x0) / LAYDOWN_TILE_VB_W) * 100, 1.2)
        const isRed = em.kind === 'uas'
        const accent = isRed ? '6,182,212' : em.kind === 'radar' ? '168,85,247' : '249,115,22'

        return (
          <div
            key={`highlight-${em.id}`}
            title={em.capabilityLabel ?? em.label}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              top: `${topPct - (prominent ? 1.5 : 0.5)}%`,
              height: `${heightPct + (prominent ? 3 : 1)}%`,
              borderRadius: 3,
              pointerEvents: 'none',
              zIndex: 7,
              border: `2px solid rgba(${accent}, ${prominent ? 0.95 : 0.7})`,
              background: `rgba(${accent}, ${prominent ? 0.25 : 0.18})`,
              boxSizing: 'border-box',
            }}
            aria-hidden
          />
        )
      })}
    </>
  )
}

export function SpectrumPulseOverlay({
  tile,
  emissions,
  showPulse = true,
  prominent = false,
  stacked = false,
}: SpectrumPulseOverlayProps) {
  const inTile = emissionsForTile(tile, emissions)
  const zones = useMemo(
    () => (inTile.length > 0 ? computeTileSpectrumZones(tile, emissions) : []),
    [tile, emissions, inTile.length],
  )

  if (inTile.length === 0) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
      {zones.map((zone, i) => (
        <div
          key={`${zone.kind}-${zone.lo}-${zone.hi}-${i}`}
          style={spectrumZoneStyle(zone, tile)}
          title={zone.kind === 'overlap' ? 'Band overlap — threat covered by blue' : 'Spectrum gap — threat not covered'}
        />
      ))}
      {!stacked && platformEmissionHighlights(tile, emissions, prominent)}
      {showPulse && null}
    </div>
  )
}

export function SpectrumPulseLegend({ compact = false }: { compact?: boolean }) {
  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: compact ? 4 : 6,
    fontFamily: 'var(--sx-mono, monospace)',
    fontSize: compact ? 8 : 9,
    letterSpacing: '0.06em',
    color: 'rgba(255,255,255,0.55)',
  }

  const swatch = (style: React.CSSProperties): React.CSSProperties => ({
    width: compact ? 10 : 14,
    height: compact ? 8 : 10,
    borderRadius: 2,
    flexShrink: 0,
    ...style,
  })

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: compact ? '6px 10px' : '8px 14px',
        marginBottom: compact ? 6 : 10,
        padding: compact ? '4px 8px' : '6px 10px',
        borderRadius: 6,
        background: 'rgba(6,182,212,0.04)',
        border: '1px solid rgba(6,182,212,0.1)',
      }}
    >
      <span style={{ ...itemStyle, color: '#06B6D4', fontWeight: 700, textTransform: 'uppercase' }}>
        Pulse overlay
      </span>
      <span style={itemStyle}>
        <span
          style={swatch({
            background: `repeating-linear-gradient(
              45deg,
              rgba(6,182,212,0.22),
              rgba(6,182,212,0.22) 2px,
              rgba(16,185,129,0.28) 2px,
              rgba(16,185,129,0.28) 4px
            )`,
            border: '1px solid rgba(6,182,212,0.65)',
            animation: 'spectrum-zone-overlap-pulse 2.5s ease-in-out infinite',
          })}
        />
        Overlap
      </span>
      <span style={itemStyle}>
        <span
          style={swatch({
            background: 'rgba(249,115,22,0.1)',
            border: '1px dashed rgba(249,115,22,0.8)',
            animation: 'spectrum-zone-gap-pulse 2.5s ease-in-out infinite',
          })}
        />
        Gap
      </span>
      <span style={itemStyle}>
        <span
          style={swatch({
            background: 'rgba(6,182,212,0.25)',
            border: '1px solid rgba(6,182,212,0.45)',
          })}
        />
        Platform band
      </span>
    </div>
  )
}
