'use client'

import { useEffect, useRef, useState } from 'react'
import { Move } from 'lucide-react'

interface NavCockpitProps {
  onRotate: (deg: number) => void
  onTilt: (movementY: number) => void
}

/** Angle in degrees from wheel center: 0 = top, 90 = right (clockwise). */
function angleFromWheel(clientX: number, clientY: number, wheelEl: HTMLElement): number {
  const rect = wheelEl.getBoundingClientRect()
  const x = clientX - rect.left - rect.width / 2
  const y = clientY - rect.top - rect.height / 2
  return Math.atan2(y, x) * (180 / Math.PI) + 90
}

export function NavCockpit({ onRotate, onTilt }: NavCockpitProps) {
  const [isDragging, setIsDragging] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onGlobalMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const wheelEl = wheelRef.current
    if (!wheelEl) return
    const onMove = (e: MouseEvent) => {
      onRotate(angleFromWheel(e.clientX, e.clientY, wheelEl))
      onTilt(e.movementY)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [isDragging, onRotate, onTilt])

  return (
    <div className="theme-on-globe relative select-none group">
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Bezel: a recessed dial inside the glass cluster. The white tick is north (heading). */}
        <div
          ref={wheelRef}
          className="absolute inset-0 rounded-full border border-[var(--glass-line)] bg-black/35 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] pointer-events-none"
        >
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-2.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0.5 h-1.5 rounded-full bg-white/30" />
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-0.5 w-1.5 rounded-full bg-white/30" />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 h-0.5 w-1.5 rounded-full bg-white/30" />
        </div>

        <div
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(true)
          }}
          onMouseUp={(e) => {
            e.stopPropagation()
            setIsDragging(false)
          }}
          title="Drag to rotate and tilt"
          className={`relative w-11 h-11 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing bg-gradient-to-b from-white/20 to-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_8px_rgba(0,0,0,0.55)] border transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none ${
            isDragging
              ? 'border-[#2997FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_0_3px_rgba(41,151,255,0.28)]'
              : 'border-[var(--store-line-strong)] hover:border-[var(--store-ink-mute)]'
          }`}
        >
          <Move className="w-[18px] h-[18px] text-white/85 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
