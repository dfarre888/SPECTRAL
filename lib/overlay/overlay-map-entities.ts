/** SAM engagement map envelopes — upper-hemisphere domes (same pattern as Map Intel C-UAS spheres). */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CesiumAny = any

export const SAM_RING_STYLES = [
  { key: 'detect_range_m' as const, label: 'Detect', fill: '#3B82F6', fillAlpha: 0.12, outlineAlpha: 0.65 },
  { key: 'track_range_m' as const, label: 'Track', fill: '#F59E0B', fillAlpha: 0.14, outlineAlpha: 0.7 },
  { key: 'launch_range_m' as const, label: 'Launch', fill: '#F97316', fillAlpha: 0.16, outlineAlpha: 0.75 },
  { key: 'lethal_range_m' as const, label: 'Lethal', fill: '#EF4444', fillAlpha: 0.18, outlineAlpha: 0.85 },
]

export function pickGlobeLonLat(
  Cesium: CesiumAny,
  viewer: CesiumAny,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  screenPosition: any,
): { lon: number; lat: number } | null {
  const ray = viewer.camera.getPickRay(screenPosition)
  if (!ray) return null
  const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
  if (!cartesian) return null
  const carto = Cesium.Cartographic.fromCartesian(cartesian)
  return {
    lon: Cesium.Math.toDegrees(carto.longitude),
    lat: Cesium.Math.toDegrees(carto.latitude),
  }
}

export function addRangeHemisphere(
  Cesium: CesiumAny,
  viewer: CesiumAny,
  id: string,
  lon: number,
  lat: number,
  centreAltM: number,
  radiusM: number,
  fillHex: string,
  fillAlpha: number,
  outlineHex: string,
  outlineAlpha: number,
) {
  viewer.entities.add({
    id,
    position: Cesium.Cartesian3.fromDegrees(lon, lat, centreAltM),
    ellipsoid: {
      radii: new Cesium.Cartesian3(radiusM, radiusM, radiusM),
      minimumCone: 0,
      maximumCone: Cesium.Math.PI_OVER_TWO,
      material: Cesium.Color.fromCssColorString(fillHex).withAlpha(fillAlpha),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(outlineHex).withAlpha(outlineAlpha),
      outlineWidth: 2,
      slicePartitions: 32,
      stackPartitions: 16,
    },
  })
}
