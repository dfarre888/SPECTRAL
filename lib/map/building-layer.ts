import type { BuildingFootprint } from '@/lib/buildings/types'
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'

const MATERIAL_COLOUR: Record<string, string> = {
  concrete: '#6B7280',
  brick: '#9CA3AF',
  glass: '#38BDF8',
  steel: '#4B5563',
  wood: '#A16207',
}

export function syncBuildingExtrusions(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  buildings: BuildingFootprint[],
): void {
  const keepIds = new Set<string>(['map-building-layer-marker'])
  const prefix = 'map-building-'

  for (const b of buildings) {
    const id = `${prefix}${b.id}`
    keepIds.add(id)
    if (b.polygon.length < 3) continue

    const positions = b.polygon.flatMap((p) => [p.lon, p.lat])
    const colour = MATERIAL_COLOUR[b.material_class] ?? '#6B7280'

    let entity = viewer.entities.getById(id)
    if (!entity) {
      entity = viewer.entities.add({
        id,
        name: `Building ${b.id}`,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
          height: 0,
          extrudedHeight: b.height_m,
          material: Cesium.Color.fromCssColorString(colour).withAlpha(0.55),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(colour).withAlpha(0.9),
        },
      })
    } else {
      entity.polygon = {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
        height: 0,
        extrudedHeight: b.height_m,
        material: Cesium.Color.fromCssColorString(colour).withAlpha(0.55),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(colour).withAlpha(0.9),
      }
    }
  }

  viewer.entities.values.forEach((e: { id?: string }) => {
    if (e.id?.startsWith(prefix) && !keepIds.has(e.id)) {
      viewer.entities.remove(e)
    }
  })
}
