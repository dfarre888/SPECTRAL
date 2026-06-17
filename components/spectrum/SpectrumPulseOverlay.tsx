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
      {inTile.map((em, i) => {
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
              background: `linear-gradient(90deg, transparent 0%, rgba(${accent}, 0.15) 20%, rgba(${accent}, 0.45) 50%, rgba(${accent}, 0.15) 80%, transparent 100%)`,
              backgroundSize: '200% 100%',
              animation: `spectrum-emission-glow ${2.4 + (i % 3) * 0.4}s ease-in-out infinite alternate, spectrum-emission-scan ${3.5 + (i % 2)}s linear infinite`,
              animationDelay: `${i * 0.35}s`,
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
}: SpectrumPulseOverlayProps) {
  const inTile = emissionsForTile(tile, emissions)
  const zones = useMemo(
    () => (inTile.length > 0 ? computeTileSpectrumZones(tile, emissions) : []),
    [tile, emissions, inTile.length],
  )

  if (inTile.length === 0) return null

  const topPct = (tile.rowTopY / tile.viewBoxH) * 100
  const heightPct = ((tile.rowBotY + tile.rowH - tile.rowTopY) / tile.viewBoxH) * 100
  const beamWidth = prominent ? 18 : 10

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
      {zones.map((zone, i) => (
        <div
          key={`${zone.kind}-${zone.lo}-${zone.hi}-${i}`}
          style={spectrumZoneStyle(zone, tile)}
          title={zone.kind === 'overlap' ? 'Band overlap — threat covered by blue' : 'Spectrum gap — threat not covered'}
        />
      ))}
      {platformEmissionHighlights(tile, emissions, prominent)}
      {showPulse && (
        <>
          <div
            style={{
              position: 'absolute',
              top: `${topPct}%`,
              height: `${heightPct}%`,
              width: beamWidth,
              left: 0,
              background: `linear-gradient(90deg, transparent, rgba(6,182,212,${prominent ? 0.35 : 0.2}), rgba(6,182,212,${prominent ? 1 : 0.85}), rgba(249,115,22,${prominent ? 0.9 : 0.6}), rgba(6,182,212,${prominent ? 1 : 0.85}), rgba(6,182,212,${prominent ? 0.35 : 0.2}), transparent)`,
              boxShadow: prominent
                ? '0 0 24px rgba(6,182,212,0.9), 0 0 48px rgba(249,115,22,0.35)'
                : '0 0 12px rgba(6,182,212,0.7)',
              animation: `spectrum-pulse-sweep ${prominent ? 3.2 : 4}s linear infinite`,
              zIndex: 8,
            }}
            aria-hidden
          />
          <div
            style={{
              position: 'absolute',
              top: `${topPct}%`,
              height: `${heightPct}%`,
              width: beamWidth * 0.6,
              left: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
              animation: `spectrum-pulse-sweep ${prominent ? 3.2 : 4}s linear infinite`,
              animationDelay: '0.12s',
              zIndex: 8,
              opacity: 0.6,
            }}
            aria-hidden
          />
        </>
      )}
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
            position: 'relative',
            overflow: 'hidden',
            background: 'rgba(6,182,212,0.12)',
            border: '1px solid rgba(6,182,212,0.45)',
          })}
        >
          <span
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '55%',
              left: 0,
              background:
                'linear-gradient(90deg, transparent, rgba(6,182,212,0.85), rgba(249,115,22,0.65), rgba(6,182,212,0.85), transparent)',
              boxShadow: '0 0 6px rgba(6,182,212,0.55)',
              animation: 'spectrum-pulse-sweep 3.2s linear infinite',
            }}
            aria-hidden
          />
        </span>
        Platform band scan
      </span>
    </div>
  )
}
