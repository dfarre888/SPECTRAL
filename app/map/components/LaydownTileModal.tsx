'use client'

/** Map Intel laydown wrapper — delegates to shared BandTileFullscreenModal. */
import { BandTileFullscreenModal } from '@/components/spectrum/BandTileFullscreenModal'
import type { BandTile } from '@/components/spectrum/band-tile-data'
import type { LaydownEmission } from '@/lib/map/laydown-tiles'

interface LaydownTileModalProps {
  tile: BandTile | null
  emissions: LaydownEmission[]
  onClose: () => void
}

export function LaydownTileModal({ tile, emissions, onClose }: LaydownTileModalProps) {
  return (
    <BandTileFullscreenModal
      tile={tile}
      emissions={emissions}
      onClose={onClose}
      variant="laydown"
    />
  )
}
