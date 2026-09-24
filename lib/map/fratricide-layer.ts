/**
 * Cesium overlay for the spectrum fratricide check.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Draws, per conflict: the stretch of drone track where the link is lost
 * (solid for own-jammer fratricide, dashed for enemy EW), a ring on each jammed
 * ground receiver, and the jammer footprint ring. Entity ids use the `frat-`
 * prefix so cesium-sync's `map-` sweep never removes them. Rings sit at
 * ellipsoid height with outlines (clamped outlines do not render on terrain);
 * Map Intel disables depth test against terrain so they stay visible.
 */
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import type { FratricideConflict, FratricideSeverity } from '@/lib/ew/fratricide'
import { formatHPlus } from '@/lib/ew/fratricide'

const PREFIX = 'frat-'

const SEV_HEX: Record<FratricideSeverity, string> = {
  high: '#FF5C6E',
  medium: '#FBBF24',
  low: '#FCD34D',
}

function colour(Cesium: CesiumModule, hex: string, alpha: number) {
  return Cesium.Color.fromCssColorString(hex).withAlpha(alpha)
}

function upsert(viewer: CesiumViewer, keep: Set<string>, id: string, props: Record<string, unknown>) {
  keep.add(id)
  const existing = viewer.entities.getById(id)
  if (existing) viewer.entities.remove(existing)
  viewer.entities.add({ id, ...props })
}

export function clearFratricideLayer(viewer: CesiumViewer) {
  const stale: unknown[] = []
  viewer.entities.values.forEach((e: { id?: string }) => {
    if (typeof e.id === 'string' && e.id.startsWith(PREFIX)) stale.push(e)
  })
  stale.forEach((e) => viewer.entities.remove(e))
}

export function syncFratricideLayer(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  conflicts: FratricideConflict[],
  selectedId: string | null,
) {
  if (!viewer || viewer.isDestroyed?.()) return
  const keep = new Set<string>()
  const footprints = new Map<string, { c: FratricideConflict; rank: number }>()
  const rank = (s: FratricideSeverity) => (s === 'high' ? 3 : s === 'medium' ? 2 : 1)

  conflicts.forEach((c, i) => {
    const hex = SEV_HEX[c.severity]
    const selected = c.id === selectedId
    const base = `${PREFIX}${i}`

    // Drone track stretch where the link is lost.
    if (c.path.length >= 2) {
      const positions = Cesium.Cartesian3.fromDegreesArrayHeights(
        c.path.flatMap((p) => [p.lon, p.lat, Math.max(p.alt_m, 5)]),
      )
      upsert(viewer, keep, `${base}-path`, {
        polyline: {
          positions,
          width: selected ? 9 : 6,
          material:
            c.kind === 'fratricide'
              ? new Cesium.PolylineGlowMaterialProperty({ color: colour(Cesium, hex, selected ? 1 : 0.9), glowPower: 0.18 })
              : new Cesium.PolylineDashMaterialProperty({ color: colour(Cesium, hex, 0.9), dashLength: 18 }),
          arcType: Cesium.ArcType.NONE,
        },
      })
    } else if (c.path.length === 1) {
      const p = c.path[0]
      upsert(viewer, keep, `${base}-pt`, {
        position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat),
        ellipse: {
          semiMajorAxis: selected ? 260 : 180,
          semiMinorAxis: selected ? 260 : 180,
          material: colour(Cesium, hex, 0.28),
          outline: true,
          outlineColor: colour(Cesium, hex, 0.95),
          outlineWidth: 2,
          height: 0,
        },
      })
    }

    // Jammed ground receivers (team ground station, relay seen from the ground).
    c.groundReceivers.forEach((g, k) => {
      upsert(viewer, keep, `${base}-rx-${k}`, {
        position: Cesium.Cartesian3.fromDegrees(g.lon, g.lat),
        ellipse: {
          semiMajorAxis: 120,
          semiMinorAxis: 120,
          material: colour(Cesium, hex, 0.18),
          outline: true,
          outlineColor: colour(Cesium, hex, 0.95),
          outlineWidth: 2,
          height: 0,
        },
      })
    })

    // Label at the point the link is first lost.
    const verb = c.severity === 'high' ? 'lost' : c.severity === 'medium' ? 'degraded' : 'marginal'
    const labelPt = c.path[0]
    upsert(viewer, keep, `${base}-label`, {
      position: Cesium.Cartesian3.fromDegrees(labelPt.lon, labelPt.lat, Math.max(labelPt.alt_m, 5) + 30),
      label: {
        text: `${c.droneName} ${verb} ${formatHPlus(c.t_start_min)}`,
        font: selected ? '600 13px JetBrains Mono' : '12px JetBrains Mono',
        fillColor: colour(Cesium, hex, 1),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -8),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        show: selected || c.severity !== 'low',
      },
    })

    const prev = footprints.get(c.jammerId)
    if (!prev || rank(c.severity) > prev.rank) {
      footprints.set(c.jammerId, { c, rank: rank(c.severity) })
    }
  })

  // One footprint ring per jammer involved, in its worst severity colour.
  for (const [jid, { c }] of footprints) {
    const hex = SEV_HEX[c.severity]
    const r = c.footprint_m
    upsert(viewer, keep, `${PREFIX}fp-${jid}`, {
      position: Cesium.Cartesian3.fromDegrees(c.jammerPosition.lon, c.jammerPosition.lat),
      ellipse: {
        semiMajorAxis: r,
        semiMinorAxis: r,
        material: colour(Cesium, hex, c.kind === 'fratricide' ? 0.07 : 0.04),
        outline: true,
        outlineColor: colour(Cesium, hex, 0.85),
        outlineWidth: 2,
        height: 0,
      },
    })
  }

  const stale: unknown[] = []
  viewer.entities.values.forEach((e: { id?: string }) => {
    if (typeof e.id === 'string' && e.id.startsWith(PREFIX) && !keep.has(e.id)) stale.push(e)
  })
  stale.forEach((e) => viewer.entities.remove(e))
  viewer.scene.requestRender()
}
