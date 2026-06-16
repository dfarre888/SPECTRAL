'use client'

import {
  computeTileSpectrumZones,
  emissionsForTile,
  spectrumZoneStyle,
  type LaydownEmission,
} from '@/lib/map/laydown-tiles'
import type { BandTile } from './band-tile-data'

export interface SpectrumPulseOverlayProps {
  tile: BandTile
  emissions: LaydownEmission[]
  showPulse?: boolean
}

export function SpectrumPulseOverlay({
  tile,
  emissions,
  showPulse = true,
}: SpectrumPulseOverlayProps) {
  const inTile = emissionsForTile(tile, emissions)
  if (inTile.length === 0) return null

  const zones = computeTileSpectrumZones(tile, emissions)
  if (zones.length === 0 && !showPulse) return null

  const topPct = (tile.rowTopY / tile.viewBoxH) * 100
  const heightPct = ((tile.rowBotY + tile.rowH - tile.rowTopY) / tile.viewBoxH) * 100

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {zones.map((zone, i) => (
        <div
          key={`${zone.kind}-${zone.lo}-${zone.hi}-${i}`}
          style={spectrumZoneStyle(zone, tile)}
          title={zone.kind === 'overlap' ? 'Band overlap — threat covered by blue' : 'Spectrum gap — threat not covered'}
        />
      ))}
      {showPulse && (
        <div
          style={{
            position: 'absolute',
            top: `${topPct}%`,
            height: `${heightPct}%`,
            width: 2,
            marginLeft: -1,
            background: 'linear-gradient(180deg, transparent, rgba(6,182,212,0.9), transparent)',
            boxShadow: '0 0 8px rgba(6,182,212,0.6)',
            animation: 'spectrum-pulse-sweep 4.5s linear infinite',
            zIndex: 6,
          }}
          aria-hidden
        />
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
              rgba(6,182,212,0.35),
              rgba(6,182,212,0.35) 2px,
              rgba(16,185,129,0.4) 2px,
              rgba(16,185,129,0.4) 4px
            )`,
            border: '1px solid rgba(6,182,212,0.6)',
          })}
        />
        Overlap
      </span>
      <span style={itemStyle}>
        <span
          style={swatch({
            background: 'rgba(249,115,22,0.15)',
            border: '1px dashed rgba(249,115,22,0.8)',
          })}
        />
        Gap
      </span>
      <span style={itemStyle}>
        <span
          style={swatch({
            background: 'linear-gradient(180deg, transparent, rgba(6,182,212,0.9), transparent)',
            boxShadow: '0 0 4px rgba(6,182,212,0.5)',
          })}
        />
        Wavelength scan
      </span>
    </div>
  )
}
