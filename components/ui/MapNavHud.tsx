'use client'

import type { CSSProperties } from 'react'
import { NavCockpit } from '@/components/ui/NavCockpit'
import { cn } from '@/lib/utils'

export interface MapNavHudProps {
  onRotate: (deg: number) => void
  onTilt: (movementY: number) => void
  zoomValue: number
  onZoomChange: (value: number) => void
  zoomMin?: number
  zoomMax?: number
  zoomStep?: number
  /** Kept for API compatibility. Both variants use the blue chrome accent. */
  zoomVariant?: 'blue' | 'orange'
  className?: string
  style?: CSSProperties
}

const ACCENT = '#2997FF'

function zoomFillPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return ((value - min) / (max - min)) * 100
}

/**
 * Camera cluster: heading/tilt dial and a zoom slider in one glass capsule.
 * Labels live inside the glass so they stay legible over bright imagery.
 */
export function MapNavHud({
  onRotate,
  onTilt,
  zoomValue,
  onZoomChange,
  zoomMin = 0,
  zoomMax = 100,
  zoomStep = 0.5,
  className,
  style,
}: MapNavHudProps) {
  const fillPct = zoomFillPercent(zoomValue, zoomMin, zoomMax)

  return (
    <div
      data-testid="map-nav-hud"
      className={cn('theme-on-globe lg-glass inline-flex items-stretch gap-2 p-2 pt-1.5', className)}
      style={style}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-medium store-text-body leading-4">Nav-Sync</span>
        <div data-testid="map-nav-wheel">
          <NavCockpit onRotate={onRotate} onTilt={onTilt} />
        </div>
      </div>
      <span aria-hidden className="w-px self-stretch my-1 bg-white/10" />
      <div className="flex flex-col items-center gap-1 w-9">
        <span className="text-[11px] font-medium store-text-body leading-4">Zoom</span>
        <div className="h-24 w-9 flex items-center justify-center overflow-visible">
          <input
            type="range"
            data-testid="map-nav-zoom"
            min={zoomMin}
            max={zoomMax}
            step={zoomStep}
            value={zoomValue}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className={cn(
              'w-[88px] h-1.5 -rotate-90 cursor-pointer appearance-none rounded-full',
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.6),0_0_0_0.5px_rgba(0,0,0,0.3)] [&::-webkit-slider-thumb]:cursor-grab',
              '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0',
            )}
            style={{
              transformOrigin: 'center center',
              background: `linear-gradient(to right, ${ACCENT} ${fillPct}%, rgba(255,255,255,0.16) ${fillPct}%)`,
            }}
            title="Zoom"
            aria-label="Zoom"
          />
        </div>
      </div>
    </div>
  )
}
