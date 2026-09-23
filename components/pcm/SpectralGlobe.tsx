'use client'

import { SCENE_GROUND } from '@/lib/ui/store-theme'
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
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString(SCENE_GROUND)
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
    <div className="pcm-globe relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      <fieldset className="lg-glass absolute left-3 top-3 z-10 px-3 pb-2.5 pt-2">
        <legend className="sr-only">Globe layers</legend>
        <p aria-hidden className="mb-1.5 text-[11px] font-medium store-text-muted">Layers</p>
        <div className="space-y-1">
          {LAYER_KEYS.map((k) => (
            <label key={k} className="flex min-h-[24px] cursor-pointer items-center gap-2.5 text-[12px] text-[var(--store-ink)]">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[var(--wb-blue)]"
                checked={layers[k]}
                onChange={() => setLayers((s) => ({ ...s, [k]: !s[k] }))}
              />
              {LAYER_LABEL[k]}
            </label>
          ))}
        </div>
      </fieldset>

      {feedLabel && (
        <div className="lg-glass absolute right-3 top-3 z-10 max-w-[240px] px-3 py-1.5 font-mono text-[11.5px] text-[#06B6D4]">
          {feedLabel}
        </div>
      )}

      <div className="lg-glass absolute bottom-3 right-3 z-10 px-3.5 py-2.5" aria-label={`Turn ${turn} of ${maxTurns}`}>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] store-text-muted">Turn</span>
          <span className="font-mono text-[15px] font-semibold tabular-nums text-[var(--store-ink)]">
            {String(turn).padStart(2, '0')}
          </span>
          <span className="font-mono text-[12px] tabular-nums store-text-muted">/ {maxTurns}</span>
        </div>
        <div className="mt-1.5 h-1 w-36 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--wb-blue)] transition-[width] duration-200 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Cesium ships its attribution at 10px; lift it to the 11px floor without hiding it. */}
      <style jsx global>{`
        .pcm-globe .cesium-widget-credits,
        .pcm-globe .cesium-widget-credits * { font-size: 11px !important; }
      `}</style>
    </div>
  )
}

const LAYER_KEYS = ['platforms', 'contacts', 'envelopes', 'fog', 'engagement'] as const

const LAYER_LABEL: Record<(typeof LAYER_KEYS)[number], string> = {
  platforms: 'Platforms',
  contacts: 'Contacts',
  envelopes: 'Detection envelopes',
  fog: 'Fog of war',
  engagement: 'Engagement geometry',
}
