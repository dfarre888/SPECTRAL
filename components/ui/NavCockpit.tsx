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
    <div className="relative select-none group">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <div
          ref={wheelRef}
          className="absolute inset-0 rounded-full border-2 border-white/25 bg-black/60 backdrop-blur-md shadow-lg pointer-events-none"
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-3.5 bg-safety rounded-full shadow-[0_0_10px_#ff8c00]" />
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
          className={`relative w-14 h-14 bg-black/70 border-2 ${
            isDragging ? 'border-safety/80 bg-black/90' : 'border-white/30'
          } rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing hover:border-safety/50 hover:bg-black/80 transition-all`}
        >
          <Move className="w-5 h-5 text-safety group-hover:text-safety/90 transition-colors pointer-events-none" />
        </div>

        <p className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-white/70 tracking-widest pointer-events-none whitespace-nowrap">
          Nav-Sync
        </p>
      </div>
    </div>
  )
}
