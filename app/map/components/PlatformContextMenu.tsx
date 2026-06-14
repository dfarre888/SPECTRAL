'use client'

import { Plus } from 'lucide-react'
import type { PlatformContextTarget } from '@/app/map/hooks/usePlatformContextMenu'

interface PlatformContextMenuProps {
  target: PlatformContextTarget
  onAdd: () => void
  onClose: () => void
}

export function PlatformContextMenu({ target, onAdd, onClose }: PlatformContextMenuProps) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 cursor-default"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="absolute z-40 min-w-[140px] rounded-xl store-panel shadow-xl border border-[var(--store-line)] overflow-hidden pointer-events-auto"
        style={{ left: target.screenX, top: target.screenY }}
        role="menu"
      >
        <p className="px-3 py-2 text-[10px] store-text-muted border-b border-[var(--store-line)] truncate">
          {target.assetName}
        </p>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onAdd()
            onClose()
          }}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-[11px] font-semibold text-white hover:bg-[var(--store-surface-2)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-[var(--store-accent)]" />
          ADD
        </button>
        <p className="px-3 py-1.5 text-[9px] store-text-muted border-t border-[var(--store-line)]">
          ~1 km offset · drag to reposition
        </p>
      </div>
    </>
  )
}
