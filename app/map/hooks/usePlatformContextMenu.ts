'use client'

import { useEffect, useRef } from 'react'
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import type { PlacementMode } from '@/lib/map/types'

export interface PlatformContextTarget {
  kind: 'uas' | 'cuas'
  instanceId: string
  assetName: string
  screenX: number
  screenY: number
}

function parseMarkEntity(entityId: string): { kind: 'uas' | 'cuas'; instanceId: string } | null {
  if (entityId.startsWith('map-uas-mark-')) {
    return { kind: 'uas', instanceId: entityId.slice('map-uas-mark-'.length) }
  }
  if (entityId.startsWith('map-cuas-mark-')) {
    return { kind: 'cuas', instanceId: entityId.slice('map-cuas-mark-'.length) }
  }
  return null
}

/**
 * Right-click on a placed platform mark opens the ADD context menu.
 */
export function usePlatformContextMenu(
  cesiumReady: boolean,
  viewerRef: React.RefObject<CesiumViewer | null>,
  cesiumRef: React.RefObject<CesiumModule | null>,
  placementModeRef: React.MutableRefObject<PlacementMode>,
  placedUasRef: React.MutableRefObject<{ instanceId: string; asset: { name: string } }[]>,
  placedCuasRef: React.MutableRefObject<{ instanceId: string; asset: { name: string } }[]>,
  onOpenMenu: (target: PlatformContextTarget) => void,
) {
  const onOpenMenuRef = useRef(onOpenMenu)
  onOpenMenuRef.current = onOpenMenu
  const handlerRef = useRef<unknown | null>(null)

  useEffect(() => {
    if (!cesiumReady) return
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium || viewer.isDestroyed?.()) return

    const canvas = viewer.scene.canvas
    const handler = new Cesium.ScreenSpaceEventHandler(canvas)
    handlerRef.current = handler

    const blockBrowserMenu = (e: Event) => e.preventDefault()
    canvas.addEventListener('contextmenu', blockBrowserMenu)

    handler.setInputAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => {
        if (placementModeRef.current.active) return

        const picked = viewer.scene.pick(e.position)
        const entityId: string | undefined = picked?.id?.id
        if (typeof entityId !== 'string') return

        const parsed = parseMarkEntity(entityId)
        if (!parsed) return

        const list = parsed.kind === 'uas' ? placedUasRef.current : placedCuasRef.current
        const placed = list.find((p) => p.instanceId === parsed.instanceId)
        if (!placed) return

        onOpenMenuRef.current({
          kind: parsed.kind,
          instanceId: parsed.instanceId,
          assetName: placed.asset.name,
          screenX: e.position.x,
          screenY: e.position.y,
        })
      },
      Cesium.ScreenSpaceEventType.RIGHT_CLICK,
    )

    return () => {
      canvas.removeEventListener('contextmenu', blockBrowserMenu)
      const h = handlerRef.current as { destroy?: () => void } | null
      h?.destroy?.()
      handlerRef.current = null
    }
  }, [cesiumReady, viewerRef, cesiumRef, placementModeRef, placedUasRef, placedCuasRef])
}
