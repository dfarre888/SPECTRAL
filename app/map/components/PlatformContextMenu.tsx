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
        className="glass-popover absolute z-40 min-w-[200px] max-w-[280px] overflow-hidden pointer-events-auto p-1"
        style={{ left: target.screenX, top: target.screenY }}
        role="menu"
        aria-label={target.assetName}
      >
        <p className="px-2.5 pt-1.5 pb-1 text-[12px] font-medium text-[var(--store-ink)] truncate" title={target.assetName}>
          {target.assetName}
        </p>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onAdd()
            onClose()
          }}
          className="map-press flex w-full items-center gap-2 h-8 px-2.5 rounded-lg text-[13px] text-[var(--store-ink)] hover:bg-[var(--wb-blue)] hover:text-white"
        >
          <Plus className="w-3.5 h-3.5" />
          Add another
        </button>
        <p className="px-2.5 pt-1 pb-1.5 text-[11.5px] store-text-muted">
          Placed about 1 km away. Drag to reposition.
        </p>
      </div>
    </>
  )
}
