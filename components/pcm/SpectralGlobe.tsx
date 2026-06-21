'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { loadCesium } from '@/lib/map/load-cesium'
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import type { PCM } from '@/lib/pcm/spectral.types'
import {
  buildDetectionEnvelopes,
  buildEngagementGeometry,
  buildFogOfWarOverlay,
  clearSpectralLayers,
  flyToScenario,
  worldStateToCesiumEntities,
  type PlayerGlobeRole,
} from '@/lib/pcm/spectral-cesium-bridge'

interface Props {
  exerciseId: string
  playerRole?: PlayerGlobeRole
}

export default function SpectralGlobe({ exerciseId, playerRole = 'ref' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CesiumViewer | null>(null)
  const cesiumRef = useRef<CesiumModule | null>(null)
  const [turn, setTurn] = useState(0)
  const [maxTurns, setMaxTurns] = useState(20)
  const [feedLabel, setFeedLabel] = useState<string | null>(null)
  const [layers, setLayers] = useState({ platforms: true, contacts: true, envelopes: true, fog: true, engagement: true })

  const renderTurn = useCallback(async (worldState: PCM.WorldState, sensorPicture: PCM.Contact[], adjudication?: PCM.AdjudicationResult) => {
    const Cesium = cesiumRef.current
    const viewer = viewerRef.current
    if (!Cesium || !viewer) return
    clearSpectralLayers(viewer)
    if (layers.platforms || layers.contacts) {
      worldStateToCesiumEntities(Cesium, viewer, worldState, layers.contacts ? sensorPicture : [], playerRole)
    }
    if (layers.envelopes) buildDetectionEnvelopes(Cesium, viewer, worldState)
    if (layers.fog) buildFogOfWarOverlay(Cesium, viewer, worldState, sensorPicture, playerRole)
    if (layers.engagement && adjudication) buildEngagementGeometry(Cesium, viewer, [], adjudication, worldState)
    setTurn(worldState.turn)
    setMaxTurns(worldState.max_turns)
  }, [layers, playerRole])

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return
    loadCesium().then((Cesium) => {
      if (!containerRef.current) return
      cesiumRef.current = Cesium
      Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || ''
      const viewer = new Cesium.Viewer(containerRef.current, {
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        homeButton: false,
        sceneModePicker: false,
        geocoder: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
      })
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0A0A0F')
      viewerRef.current = viewer
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/spectral/exercises/${exerciseId}/globe-state`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data.world_state) return
        await renderTurn(data.world_state, data.sensor_picture ?? [], data.adjudication_result)
        if (data.feed_classification) setFeedLabel(data.feed_classification)
      } catch { /* noop */ }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => { cancelled = true; clearInterval(id) }
  }, [exerciseId, renderTurn])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        const v = viewerRef.current
        const C = cesiumRef.current
        if (v && C) fetch(`/api/spectral/exercises/${exerciseId}/globe-state`).then((r) => r.json()).then((d) => d.world_state && flyToScenario(C, v, d.world_state))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exerciseId])

  const pct = maxTurns > 0 ? Math.round((turn / maxTurns) * 100) : 0

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/70 border border-white/10 px-3 py-2 font-mono text-[10px] text-[#F97316]">
        TURN {String(turn).padStart(2, '0')} / {maxTurns}
        <div className="mt-1 h-1.5 w-32 bg-white/10 rounded overflow-hidden">
          <div className="h-full bg-[#F97316]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {feedLabel && (
        <div className="absolute top-3 right-3 z-10 rounded-lg bg-black/70 border border-cyan/30 px-2 py-1 font-mono text-[9px] text-cyan max-w-[220px]">
          {feedLabel}
        </div>
      )}
      <div className="absolute top-3 left-3 z-10 rounded-lg bg-black/70 border border-white/10 p-2 space-y-1 text-[9px] font-mono text-white/70">
        {(['platforms', 'contacts', 'envelopes', 'fog', 'engagement'] as const).map((k) => (
          <label key={k} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={layers[k]} onChange={() => setLayers((s) => ({ ...s, [k]: !s[k] }))} />
            {k}
          </label>
        ))}
      </div>
    </div>
  )
}
