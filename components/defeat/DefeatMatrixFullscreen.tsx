'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { Download, Grid3x3, Table2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#0A0A0F]"
      role="dialog"
      aria-modal="true"
      aria-label="Effectiveness matrix full screen"
    >
      <div className="shrink-0 border-b border-[var(--store-line)] bg-[var(--store-surface)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--store-accent)]">
              Effectiveness Matrix
            </p>
            <p className="text-xs font-mono store-text-muted mt-0.5">
              {platformCount} platforms × {systemCount} defeat systems
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-[var(--store-line)] overflow-hidden">
              <button
                type="button"
                onClick={() => onViewChange('table')}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono flex items-center gap-1',
                  view === 'table' ? 'bg-[#F97316] text-white' : 'store-text-muted',
                )}
              >
                <Table2 className="h-3.5 w-3.5" /> Table
              </button>
              <button
                type="button"
                onClick={() => onViewChange('heatmap')}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono flex items-center gap-1',
                  view === 'heatmap' ? 'bg-[#F97316] text-white' : 'store-text-muted',
                )}
              >
                <Grid3x3 className="h-3.5 w-3.5" /> Heat map
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--store-line)] p-2 text-white hover:bg-[var(--store-surface-2)] transition-colors"
              aria-label="Close full screen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="store-panel rounded-2xl overflow-hidden min-h-full">{children}</div>
      </div>
    </div>
  )
}
