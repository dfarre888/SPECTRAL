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
  zoomVariant?: 'blue' | 'orange'
  className?: string
  style?: CSSProperties
}

const BLUE_THUMB = '#2563eb'

function zoomFillPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return ((value - min) / (max - min)) * 100
}

export function MapNavHud({
  onRotate,
  onTilt,
  zoomValue,
  onZoomChange,
  zoomMin = 0,
  zoomMax = 100,
  zoomStep = 0.5,
  zoomVariant = 'blue',
  className,
  style,
}: MapNavHudProps) {
  const fillPct = zoomFillPercent(zoomValue, zoomMin, zoomMax)
  const isBlue = zoomVariant === 'blue'

  const zoomShellClass = isBlue
    ? 'flex flex-col items-center gap-1.5 px-3 pt-2 pb-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10'
    : 'flex flex-col items-center gap-1.5'

  const zoomLabelClass = isBlue
    ? 'text-[8px] font-black text-white/40 uppercase tracking-widest'
    : 'text-[8px] font-bold text-white/50 uppercase tracking-wider'

  const zoomTrackClass = isBlue
    ? 'h-36 w-6 flex items-center justify-center overflow-visible'
    : 'h-28 w-6 flex items-center justify-center'

  const zoomSliderClass = isBlue
    ? 'w-36 h-4 -rotate-90 cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2563eb] [&::-webkit-slider-thumb]:shadow-[0_0_14px_rgba(37,99,235,0.5)] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:h-full'
    : 'w-28 h-6 -rotate-90 cursor-pointer appearance-none rounded-full bg-white/10 accent-safety [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-safety [&::-webkit-slider-thumb]:shadow-[0_0_8px_#ff8c00] [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-safety [&::-moz-range-thumb]:border-0'

  const zoomSliderStyle: CSSProperties = isBlue
    ? {
        transformOrigin: 'center center',
        background: `linear-gradient(to right, ${BLUE_THUMB} ${fillPct}%, rgba(255,255,255,0.12) ${fillPct}%)`,
      }
    : { transformOrigin: 'center center' }

  return (
    <div
      data-testid="map-nav-hud"
      className={cn('flex items-center gap-3', className)}
      style={style}
    >
      <div data-testid="map-nav-wheel">
        <NavCockpit onRotate={onRotate} onTilt={onTilt} />
      </div>
      <div className={zoomShellClass}>
        <span className={zoomLabelClass}>Zoom</span>
        <div className={zoomTrackClass}>
          <input
            type="range"
            data-testid="map-nav-zoom"
            min={zoomMin}
            max={zoomMax}
            step={zoomStep}
            value={zoomValue}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className={zoomSliderClass}
            style={zoomSliderStyle}
            title="Zoom"
            aria-label="Zoom"
          />
        </div>
      </div>
    </div>
  )
}
