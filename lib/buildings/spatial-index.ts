import type { BuildingFootprint } from '@/lib/buildings/types'

/**
 * Grid spatial index for building footprints (R-tree substitute for v1).
 */
export class BuildingSpatialIndex {
  readonly tenantId: string
  private cellDeg = 0.002
  private grid = new Map<string, BuildingFootprint[]>()

  constructor(buildings: BuildingFootprint[], tenantId: string, cellDeg = 0.002) {
    this.tenantId = tenantId
    this.cellDeg = cellDeg
    const scoped = buildings.filter((b) => b.tenantId === tenantId)
    for (const b of scoped) {
      const key = this.keyFor(b.polygon[0]?.lat ?? 0, b.polygon[0]?.lon ?? 0)
      const arr = this.grid.get(key) ?? []
      arr.push(b)
      this.grid.set(key, arr)
    }
  }

  private keyFor(lat: number, lon: number): string {
    const gy = Math.floor(lat / this.cellDeg)
    const gx = Math.floor(lon / this.cellDeg)
    return `${gy}:${gx}`
  }

  queryBounds(south: number, west: number, north: number, east: number): BuildingFootprint[] {
    const out: BuildingFootprint[] = []
    const seen = new Set<string>()
    const lat0 = Math.floor(south / this.cellDeg) * this.cellDeg
    const lat1 = Math.ceil(north / this.cellDeg) * this.cellDeg
    const lon0 = Math.floor(west / this.cellDeg) * this.cellDeg
    const lon1 = Math.ceil(east / this.cellDeg) * this.cellDeg

    for (let lat = lat0; lat <= lat1; lat += this.cellDeg) {
      for (let lon = lon0; lon <= lon1; lon += this.cellDeg) {
        const key = this.keyFor(lat, lon)
        for (const b of this.grid.get(key) ?? []) {
          if (seen.has(b.id)) continue
          seen.add(b.id)
          out.push(b)
        }
      }
    }
    return out
  }
}
