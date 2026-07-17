'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { INCIDENT_TYPE_COLOR, normalizeIncidentType } from '@/lib/conflicts/incident-style'
import type { ConflictIncident } from '@/lib/conflicts/types'
import { loadCesium } from '@/lib/map/load-cesium'
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import { ConflictMap } from '@/components/conflict/ConflictMap'

const MAP_HEIGHT = 440

function entityId(incidentId: string) {
  return `conflict-incident-${incidentId}`
}

export function ConflictCesiumMap({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: ConflictIncident[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CesiumViewer | null>(null)
  const cesiumRef = useRef<CesiumModule | null>(null)
  const handlerRef = useRef<{ destroy?: () => void } | null>(null)
  const onSelectRef = useRef(onSelect)
  const [failed, setFailed] = useState(false)
  const [viewerReady, setViewerReady] = useState(false)

  onSelectRef.current = onSelect

  const syncEntities = useCallback(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium) return

    const keep = new Set<string>()
    for (const inc of incidents) {
      if (!Number.isFinite(inc.lat) || !Number.isFinite(inc.lon)) continue
      const id = entityId(inc.id)
      keep.add(id)
      const type = normalizeIncidentType(inc.incident_type)
      const hex = INCIDENT_TYPE_COLOR[type]
      const active = inc.id === selectedId
      const color = Cesium.Color.fromCssColorString(hex)
      let entity = viewer.entities.getById(id)
      if (!entity) {
        entity = viewer.entities.add({ id, name: inc.incident_title })
      }
      entity.position = new Cesium.ConstantPositionProperty(
        Cesium.Cartesian3.fromDegrees(inc.lon, inc.lat, 0),
      )
      entity.point = new Cesium.PointGraphics({
        pixelSize: active ? 14 : 10,
        color: active ? Cesium.Color.WHITE : color,
        outlineColor: active ? color : Cesium.Color.BLACK,
        outlineWidth: active ? 3 : 1.5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      })
      entity.label = active
        ? new Cesium.LabelGraphics({
            text: inc.incident_title,
            font: '11px JetBrains Mono, monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('#0A0A0F').withAlpha(0.85),
          })
        : undefined
    }

    const stale: { id?: string }[] = []
    viewer.entities.values.forEach((e: { id?: string }) => {
      if (e.id?.startsWith('conflict-incident-') && !keep.has(e.id)) stale.push(e)
    })
    stale.forEach((e) => viewer.entities.remove(e))
    viewer.scene.requestRender()
  }, [incidents, selectedId])

  const flyCamera = useCallback(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium) return

    const geo = incidents.filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lon))
    const selected = geo.find((i) => i.id === selectedId)
    if (selected) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(selected.lon, selected.lat, 1_200_000),
        duration: 0.8,
      })
    } else if (geo.length > 0) {
      const positions = geo.map((i) => Cesium.Cartesian3.fromDegrees(i.lon, i.lat))
      const bs = Cesium.BoundingSphere.fromPoints(positions)
      viewer.camera.flyToBoundingSphere(bs, {
        duration: 0,
        offset: new Cesium.HeadingPitchRange(0, -0.6, Math.max(bs.radius * 2.2, 500_000)),
      })
    }
  }, [incidents, selectedId])

  const initViewer = useCallback(async (cancelled: () => boolean) => {
    if (!containerRef.current || viewerRef.current) return
    const Cesium = await loadCesium()
    if (cancelled()) return

    cesiumRef.current = Cesium
    const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN
    if (token) Cesium.Ion.defaultAccessToken = token
    if (cancelled() || !containerRef.current) return

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      creditContainer: document.createElement('div'),
      requestRenderMode: true,
    }) as CesiumViewer

    if (cancelled()) {
      viewer.destroy()
      return
    }

    viewerRef.current = viewer
    viewer.scene.globe.depthTestAgainstTerrain = true

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handlerRef.current = handler
    handler.setInputAction((click: { position: unknown }) => {
      const picked = viewer.scene.pick(click.position as never)
      const id: string | undefined = picked?.id?.id
      if (typeof id === 'string' && id.startsWith('conflict-incident-')) {
        onSelectRef.current(id.slice('conflict-incident-'.length))
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    if (cancelled()) {
      handler.destroy()
      handlerRef.current = null
      viewer.destroy()
      viewerRef.current = null
      cesiumRef.current = null
      return
    }

    setViewerReady(true)
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setFailed(true)
      return
    }

    let cancelled = false
    const isCancelled = () => cancelled

    void initViewer(isCancelled).catch(() => {
      if (!cancelled) setFailed(true)
    })

    return () => {
      cancelled = true
      setViewerReady(false)
      handlerRef.current?.destroy?.()
      handlerRef.current = null
      viewerRef.current?.destroy()
      viewerRef.current = null
      cesiumRef.current = null
    }
  }, [initViewer])

  useEffect(() => {
    if (!viewerReady || failed) return
    syncEntities()
  }, [viewerReady, failed, syncEntities])

  useEffect(() => {
    if (!viewerReady || failed) return
    flyCamera()
  }, [viewerReady, failed, flyCamera])

  if (failed) {
    return <ConflictMap incidents={incidents} selectedId={selectedId} onSelect={onSelect} />
  }

  return (
    <div className="relative rounded-xl border border-[var(--store-line)] overflow-hidden bg-[#0A0A0F]" style={{ height: MAP_HEIGHT }}>
      <div ref={containerRef} className="absolute inset-0" />
      {!viewerReady ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono store-text-muted bg-[#0A0A0F]/80">
          Loading globe…
        </div>
      ) : null}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5 max-w-[70%] pointer-events-none">
        {(['cruise_strike', 'ballistic_strike', 'swarm', 'naval', 'intercept', 'uas_strike'] as const).map((t) => (
          <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white/90 border border-white/10">
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: INCIDENT_TYPE_COLOR[t] }} />
            {t.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
      {viewerReady && incidents.length === 0 ? (
        <p className="absolute top-2 right-2 text-[10px] font-mono store-text-muted bg-black/60 px-2 py-1 rounded">
          No geolocated incidents
        </p>
      ) : null}
    </div>
  )
}
