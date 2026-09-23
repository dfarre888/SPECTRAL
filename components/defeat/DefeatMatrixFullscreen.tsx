'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

type MatrixView = 'table' | 'heatmap'

interface DefeatMatrixFullscreenProps {
  open: boolean
  onClose: () => void
  view: MatrixView
  onViewChange: (view: MatrixView) => void
  platformCount: number
  systemCount: number
  onExport: () => void
  children: ReactNode
}

export function DefeatMatrixFullscreen({
  open,
  onClose,
  view,
  onViewChange,
  platformCount,
  systemCount,
  onExport,
  children,
}: DefeatMatrixFullscreenProps) {
  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    // Starts below the 20px classification banner so the marking stays on screen.
    <div
      className="fixed inset-x-0 bottom-0 top-5 z-[100] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Defeat matrix full screen"
    >
      <div className="relative shrink-0 border-b border-[var(--glass-line)] bg-[rgba(10,10,12,0.72)] px-4 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-4">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--store-ink)] leading-tight">Defeat Matrix</p>
            <p className="mt-0.5 font-mono text-[11.5px] tabular-nums store-text-muted">
              {platformCount} platforms × {systemCount} effectors
            </p>
          </div>
          <div className="seg sm" role="group" aria-label="Matrix view">
            <button type="button" aria-pressed={view === 'table'} onClick={() => onViewChange('table')}>
              Table
            </button>
            <button type="button" aria-pressed={view === 'heatmap'} onClick={() => onViewChange('heatmap')}>
              Heat map
            </button>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button type="button" onClick={onExport} className="fc-action">
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="glass-icon-btn"
              aria-label="Close full screen"
              title="Close (Esc)"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-4">{children}</div>
    </div>
  )
}
