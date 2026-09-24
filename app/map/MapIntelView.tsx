'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { readMapStaging, clearMapStaging, resolveMapStagingIds } from '@/lib/spectrum/map-staging'
import { AssetSidebar } from '@/app/map/components/AssetSidebar'
import { SpectralAnalysisPanel } from '@/app/map/components/SpectralAnalysisPanel'
import { MapNavigationWheel } from '@/app/map/components/MapNavigationWheel'
import { EntityInfoPanel } from '@/app/map/components/EntityInfoPanel'
import { FlightDetailsPanel } from '@/app/map/components/FlightDetailsPanel'
import { EncounterAssessmentPanel } from '@/app/map/components/EncounterAssessmentPanel'
import { PlatformContextMenu } from '@/app/map/components/PlatformContextMenu'
import { LaydownEvaluationPanel } from '@/app/map/components/LaydownEvaluationPanel'
import type { PlatformContextTarget } from '@/app/map/hooks/usePlatformContextMenu'
import { useDefeatOverlap } from '@/app/map/hooks/useDefeatOverlap'
import { useLaydownAdjudication } from '@/app/map/hooks/useLaydownAdjudication'
import { usePropagationHeatmap } from '@/app/map/hooks/usePropagationHeatmap'
import { useLoiterPlanning } from '@/app/map/hooks/useLoiterPlanning'
import { useMissionPlanning } from '@/app/map/hooks/useMissionPlanning'
import { MissionGoalDialog } from '@/app/map/components/MissionGoalDialog'
import { WaypointContextMenu, type WaypointContextTarget } from '@/app/map/components/WaypointContextMenu'
import {
  usePlatformPlacement,
  type CesiumContext,
} from '@/app/map/hooks/usePlatformPlacement'
import { useEnvelopeWalls } from '@/app/map/hooks/useEnvelopeWalls'
import { useTerrainMasking } from '@/app/map/hooks/useTerrainMasking'
import { useMapBuildings } from '@/app/map/hooks/useMapBuildings'
import { useWindData } from '@/app/map/hooks/useWindData'
import { writeLaydownSession } from '@/lib/map/laydown-session'
import { writeDashboardSelectedAssetId } from '@/lib/dashboard/laydown-bridge'
import { useBattlespacePlan } from '@/app/map/hooks/useBattlespacePlan'
import { PlannerToolbar } from '@/components/planner/PlannerToolbar'
import { PlanLoadDialog } from '@/components/planner/PlanLoadDialog'
import toast from 'react-hot-toast'
import { IadsStackPanel } from '@/app/map/components/IadsStackPanel'
import { MapCard } from '@/app/map/components/MapUi'
import { Download, Layers, LayoutTemplate, PanelLeftOpen, Route, X } from 'lucide-react'
import { getVignette, vignetteToLaydown } from '@/lib/planner/vignettes'
import { FratricidePanel } from '@/app/map/components/FratricidePanel'
import { MapMenu } from '@/app/map/components/MapUi'
import {
  buildPresetLaydown,
  ensurePresetFallbackAssets,
  LAYDOWN_PRESETS,
  type LaydownPresetId,
} from '@/lib/map/laydown-presets'
import { applyMitigationPatch, clearMitigations, runLaydownFratricide } from '@/lib/map/fratricide-adapter'
import { clearFratricideLayer, syncFratricideLayer } from '@/lib/map/fratricide-layer'
import {
  DEFAULT_FRATRICIDE_OPTIONS,
  type FratricideConflict,
  type FratricideOptions,
  type MitigationPatch,
} from '@/lib/ew/fratricide'
import { buildExportDocument, EXPORT_FORMATS, renderExport, type ExportFormat } from '@/lib/map/export'
import { cuasCallsign, uasCallsign } from '@/lib/map/laydown-sides'
import { hydrateLaydown } from '@/lib/planner/battlespace-plan'
import { readForcePackage, clearForcePackage } from '@/lib/force/package-session'
import { haversineM } from '@/lib/propagation/geo'
import {
  buildLaydownEvaluation,
  resolvePlacedInstance,
  catalogEffectors,
  catalogRadars,
  isSameLaydownItem,
  listPlacedLaydownItems,
  uasCommanderCompare,
  type EvaluatedItem,
  type SelectedLaydownItem,
} from '@/lib/map/laydown-evaluation'
import { formatEffectorDisplayName, formatRadarDisplayName } from '@/lib/map/catalog-display-name'
import { getSpectraMapAssets, toMapEffectorAsset, toMapRadarAsset } from '@/lib/map/spectra-assets'
import { buildThreatAssessments } from '@/lib/map/threat-assessment'
import { resolveAssetPlacement } from '@/lib/map/counter-system-registry'
import { envelopeDiscAltitudeM } from '@/lib/map/range-declaration'
import type { TerrainHeightUpdate } from '@/lib/map/terrain'
import { cn } from '@/lib/utils'
import { GlobeSkeleton } from '@/components/ui/loading-skeleton'
import { ensureCotsMapAssets } from '@/lib/map/ensure-cots-assets'
import type { MapAssetsPayload, CursorPosition, PlacementMode, PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas, MapCuasAsset, MapEffectorAsset, MapRadarAsset, MapUasAsset } from '@/lib/map/types'
import type { RcsFacets } from '@/lib/spectral/detectionPhysicsConstants'

import { CollateralRiskPanel } from '@/app/map/components/CollateralRiskPanel'
import { CuasSitingPlanner } from '@/app/map/components/CuasSitingPlanner'
import { EwFootprintAnalyser } from '@/app/map/components/EwFootprintAnalyser'
import { useRiskOverlayController } from '@/app/map/hooks/useRiskOverlayController'
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import {
  computeCde,
  WARHEAD_DB,
  JAMMER_DB,
  type CdeResult,
  type PopulationDensityTier,
  type TimeOfDay,
  type BuildingProtection,
} from '@/lib/risk'
import { getWarheadsForPlatform } from '@/lib/risk/warhead-db'

const CesiumMapPanel = dynamic(() => import('./CesiumMapPanel'), {
  ssr: false,
  loading: () => <GlobeSkeleton className="absolute inset-0 !rounded-none" />,
})

const MapBottomBar = dynamic(
  () => import('./CesiumMapPanel').then((m) => ({ default: m.MapBottomBar })),
  { ssr: false }
)

function mapToolbarBtn(active: boolean): string {
  // Glass-layer buttons: transparent at rest, blue with a glow when active
  // (see .lg-btn in globals.css). 32px tall, 13px labels.
  return `lg-btn map-press !min-h-8 !text-[13px] !px-2.5${active ? ' on' : ''}`
}

/** Asset panel width, and the inset every left-anchored overlay clears. */
const ASSET_PANEL_W = 300
const GUTTER = 12
/** Inspector column (analysis tools, laydown evaluation) on the right. */
const INSPECTOR_W = 360

interface MapIntelViewProps {
  initialAssets: MapAssetsPayload
}

export default function MapIntelView({ initialAssets }: MapIntelViewProps) {
  const searchParams = useSearchParams()
  const [assets] = useState(() => ensurePresetFallbackAssets(ensureCotsMapAssets(initialAssets)))
  const [placedUas, setPlacedUas] = useState<PlacedUas[]>([])
  const [rcsOverrides, setRcsOverrides] = useState<Record<string, RcsFacets>>({})
  const [placedCuas, setPlacedCuas] = useState<PlacedCuas[]>([])
  const [placedRadars, setPlacedRadars] = useState<PlacedRadar[]>([])
  const [placedEffectors, setPlacedEffectors] = useState<PlacedEffector[]>([])
  const [placementMode, setPlacementMode] = useState<PlacementMode>({ active: false })
  const [nilWind, setNilWind] = useState(true)
  const [cursor, setCursor] = useState<CursorPosition>({ lon: 0, lat: 0, terrainAMSL: null })
  const [panelScreenPos, setPanelScreenPos] = useState<{ x: number; y: number } | null>(null)
  const [stagingBanner, setStagingBanner] = useState<{
    stagedCount: number
    matchedCount: number
  } | null>(null)
  const [forceBanner, setForceBanner] = useState<{
    theatre: string
    placed: number
    unmatched: number
  } | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const [terrainEpoch, setTerrainEpoch] = useState(0)
  const [spectralOpen, setSpectralOpen] = useState(false)
  const [heatmapEnabled, setHeatmapEnabled] = useState(false)
  const [platformContextMenu, setPlatformContextMenu] = useState<PlatformContextTarget | null>(null)
  const [selectedLaydownItem, setSelectedLaydownItem] = useState<SelectedLaydownItem | null>(null)
  const prevPlacedCountsRef = useRef({ uas: 0, cuas: 0, radar: 0, effector: 0 })
  const [pendingMissionUasId, setPendingMissionUasId] = useState<string | null>(null)
  const [waypointContextMenu, setWaypointContextMenu] = useState<WaypointContextTarget | null>(null)
  const [missionNotice, setMissionNotice] = useState<string | null>(null)
  const [loadPlanOpen, setLoadPlanOpen] = useState(false)
  const [assetPanelOpen, setAssetPanelOpen] = useState(true)
  // Toolbar and laydown bar heights (they wrap on narrow screens); side columns start below them.
  const toolbarRowRef = useRef<HTMLDivElement>(null)
  const bottomBarRef = useRef<HTMLDivElement>(null)
  const [chromeH, setChromeH] = useState({ top: 42, bottom: 42 })

  type MapToolMode = 'none' | 'cuas-siting' | 'ew-deconflict' | 'fratricide'

  const [mapTool, setMapTool] = useState<MapToolMode>('none')
  const [fratOptions, setFratOptions] = useState<FratricideOptions>(DEFAULT_FRATRICIDE_OPTIONS)
  const [fratView, setFratView] = useState<'fratricide' | 'enemy' | 'all'>('fratricide')
  const [fratSelectedId, setFratSelectedId] = useState<string | null>(null)
  const [presetBanner, setPresetBanner] = useState<{ name: string; standIns: string[]; missing: string[] } | null>(null)
  const [pendingView, setPendingView] = useState<{ lon: number; lat: number; height_m?: number } | null>(null)
  const [flightPathEditActive, setFlightPathEditActive] = useState(false)
  const [riskPopTier, setRiskPopTier] = useState<PopulationDensityTier>('urban')
  const [riskTimeOfDay, setRiskTimeOfDay] = useState<TimeOfDay>('business_day')
  const [riskProtection, setRiskProtection] = useState<BuildingProtection>('light')
  const [cdeResult, setCdeResult] = useState<CdeResult | null>(null)
  const cesiumViewerRef = useRef<CesiumViewer | null>(null)
  const cesiumModuleRef = useRef<CesiumModule | null>(null)
  const placementModeRef = useRef<PlacementMode>({ active: false })

  const cesiumCtxRef = useRef<CesiumContext | null>(null)
  const [cesiumReady, setCesiumReady] = useState(false)
  const getCesium = useCallback(() => cesiumCtxRef.current, [])

  const onCesiumReady = useCallback((ctx: CesiumContext) => {
    cesiumCtxRef.current = ctx
    cesiumViewerRef.current = ctx.viewer
    cesiumModuleRef.current = ctx.Cesium
    setCesiumReady(true)
  }, [])

  const handleSelectPlacedItem = useCallback((item: SelectedLaydownItem | null) => {
    setSelectedLaydownItem(item)
    if (item?.instanceId) writeDashboardSelectedAssetId(item.instanceId)
  }, [])

  const {
    riskMode,
    riskLon,
    riskLat,
    selectedWarhead,
    setSelectedWarhead,
    selectedJammer,
    setSelectedJammer,
    riskRingShade,
    setRiskRingShade,
    activateBlastRisk: activateBlastRiskBase,
    activateJammingRisk: activateJammingRiskBase,
    closeRiskOverlay,
    repositionRiskAt,
  } = useRiskOverlayController({
    cesiumCtxRef,
    cesiumReady,
    cesiumViewerRef,
    cesiumModuleRef,
    placementModeRef,
    cursorLon: cursor.lon,
    cursorLat: cursor.lat,
  })

  const activateBlastRisk = useCallback(() => {
    setMapTool('none')
    activateBlastRiskBase()
  }, [activateBlastRiskBase])

  const openBlastAtMissionTarget = useCallback(
    (uas: PlacedUas) => {
      const mission = uas.mission
      if (!mission || mission.goalKind !== 'target') return
      const warheads = getWarheadsForPlatform(uas.asset.id)
      if (warheads[0]) setSelectedWarhead(warheads[0])
      void repositionRiskAt(mission.goalLon, mission.goalLat)
      activateBlastRisk()
    },
    [activateBlastRisk, repositionRiskAt, setSelectedWarhead],
  )


  const activateJammingRisk = useCallback(() => {
    setMapTool('none')
    activateJammingRiskBase()
  }, [activateJammingRiskBase])

  const {
    placeAt,
    placeCuasAt,
    startUasPlacement,
    startCuasPlacement,
    startRadarPlacement,
    startEffectorPlacement,
    cancelPlacement,
    duplicateAdjacent,
  } = usePlatformPlacement(
    placementMode,
    setPlacementMode,
    placedUas,
    placedCuas,
    placedRadars,
    placedEffectors,
    setPlacedUas,
    setPlacedCuas,
    setPlacedRadars,
    setPlacedEffectors,
    getCesium,
    (uas) => {
      setPendingMissionUasId(uas.instanceId)
    },
  )

  const routeCatalogPlacement = useCallback(
    (assetId: string) => {
      const resolved = resolveAssetPlacement(assetId, assets)
      if (!resolved) return
      switch (resolved.kind) {
        case 'uas':
          startUasPlacement(resolved.asset as MapUasAsset)
          break
        case 'cuas':
          startCuasPlacement(resolved.asset as MapCuasAsset)
          break
        case 'radar':
          startRadarPlacement(resolved.asset as MapRadarAsset)
          break
        case 'effector':
          startEffectorPlacement(resolved.asset as MapEffectorAsset)
          break
      }
    },
    [assets, startUasPlacement, startCuasPlacement, startRadarPlacement, startEffectorPlacement],
  )

  const handleSelectUas = useCallback(
    (asset: MapUasAsset) => {
      routeCatalogPlacement(asset.id)
    },
    [routeCatalogPlacement],
  )

  const handleAddFromEvaluation = useCallback(
    (item: EvaluatedItem) => {
      switch (item.kind) {
        case 'uas': {
          routeCatalogPlacement(item.assetId)
          break
        }
        case 'cuas': {
          const asset = assets.cuas.find((a) => a.id === item.assetId)
          if (asset) startCuasPlacement(asset)
          break
        }
        case 'radar': {
          let asset = assets.radars.find((a) => a.id === item.assetId)
          if (!asset) {
            const seed = catalogRadars().find((r) => r.id === item.assetId)
            if (seed) asset = toMapRadarAsset(seed)
            else asset = getSpectraMapAssets().radars.find((r) => r.id === item.assetId)
          }
          if (asset) startRadarPlacement(asset)
          break
        }
        case 'effector': {
          let asset = assets.effectors.find((a) => a.id === item.assetId)
          if (!asset) {
            const seed = catalogEffectors().find((e) => e.id === item.assetId)
            if (seed) {
              const { radars } = getSpectraMapAssets()
              const radarById = new Map(radars.map((r) => [r.id, r]))
              asset = toMapEffectorAsset(seed, radarById)
            } else {
              asset = getSpectraMapAssets().effectors.find((e) => e.id === item.assetId)
            }
          }
          if (asset) startEffectorPlacement(asset)
          break
        }
      }
    },
    [assets, startUasPlacement, startCuasPlacement, startRadarPlacement, startEffectorPlacement],
  )

  const { startLoiterMode, placeLoiterWaypoint, clearLoiter } = useLoiterPlanning(
    placementMode,
    setPlacementMode,
    setPlacedUas,
    getCesium
  )

  const maskingPolygons = useTerrainMasking(
    placedCuas,
    getCesium,
    setPlacedCuas,
    terrainEpoch,
  )
  const { overlaps, source: overlapSource } = useDefeatOverlap(placedUas, placedCuas)


  useEffect(() => {
    placementModeRef.current = placementMode
  }, [placementMode])

  useEffect(() => {
    if (
      riskMode !== 'blast' ||
      !selectedWarhead ||
      riskLon === null ||
      riskLat === null
    ) {
      setCdeResult(null)
      return
    }
    setCdeResult(
      computeCde({
        impact_lon: riskLon,
        impact_lat: riskLat,
        blast: selectedWarhead,
        population_tier: riskPopTier,
        time_of_day: riskTimeOfDay,
        building_protection: riskProtection,
        nearby_infrastructure: ['none'],
      }),
    )
  }, [
    riskMode,
    selectedWarhead,
    riskLon,
    riskLat,
    riskPopTier,
    riskTimeOfDay,
    riskProtection,
  ])

  const handleRcsChange = useCallback((uasInstanceId: string, facets: RcsFacets | undefined) => {
    setRcsOverrides((prev) => {
      if (!facets) {
        const next = { ...prev }
        delete next[uasInstanceId]
        return next
      }
      return { ...prev, [uasInstanceId]: facets }
    })
  }, [])

  const {
    startMissionGoal,
    placeMissionGoal,
    replanMission,
    autoPlanDefaultMission,
    addWaypointOnPath,
    updateWaypoint,
    setEmcon,
    setRouteObjective,
    clearMission,
    suppressAutoPlan,
    enableFlightPathEdit,
  } = useMissionPlanning(
    placementMode, setPlacementMode, placedUas, placedCuas, placedRadars, placedEffectors, overlaps, setPlacedUas, getCesium, rcsOverrides, pendingMissionUasId, flightPathEditActive,
  )

  const toggleFlightPathEdit = useCallback(() => {
    if (flightPathEditActive) {
      setFlightPathEditActive(false)
      setMissionNotice(null)
      return
    }
    void enableFlightPathEdit().then((result) => {
      if (!result.ok) {
        setMissionNotice(result.reason)
        return
      }
      closeRiskOverlay()
      setMapTool('none')
      setFlightPathEditActive(true)
      // The flight-path banner carries the instructions; clear any stale notice.
      setMissionNotice(null)
    })
  }, [flightPathEditActive, enableFlightPathEdit, closeRiskOverlay])

  const pendingMissionUas = useMemo(() => placedUas.find((u) => u.instanceId === pendingMissionUasId) ?? null, [placedUas, pendingMissionUasId])
  const adjudication = useLaydownAdjudication(
    placedUas,
    placedCuas,
    overlaps,
    placedUas.length > 0 && placedCuas.length > 0,
    maskingPolygons,
    getCesium,
  )
  const planner = useBattlespacePlan(
    assets,
    { placedUas, placedCuas, placedRadars, placedEffectors },
    { setPlacedUas, setPlacedCuas, setPlacedRadars, setPlacedEffectors },
  )
  const [showIadsPanel, setShowIadsPanel] = useState(false)

  const heatmapJammer =
    placedCuas.find((c) => c.asset.defeat_methods.includes('RF_jamming')) ?? placedCuas[0] ?? null
  const heatmapReceiverAlt =
    placedUas[0]?.discAltitude_m ?? heatmapJammer?.terrainAMSL ?? 100
  const heatmap = usePropagationHeatmap(heatmapEnabled, heatmapJammer, heatmapReceiverAlt)
  const buildingBounds = useMemo(() => {
    const pts = [
      ...placedUas.map((u) => ({ lat: u.lat, lon: u.lon })),
      ...placedCuas.map((c) => ({ lat: c.lat, lon: c.lon })),
    ]
    if (pts.length === 0 && cursor.lon) {
      const pad = 0.02
      return {
        south: cursor.lat - pad,
        north: cursor.lat + pad,
        west: cursor.lon - pad,
        east: cursor.lon + pad,
      }
    }
    if (pts.length === 0) return null
    const lats = pts.map((p) => p.lat)
    const lons = pts.map((p) => p.lon)
    const pad = 0.015
    return {
      south: Math.min(...lats) - pad,
      north: Math.max(...lats) + pad,
      west: Math.min(...lons) - pad,
      east: Math.max(...lons) + pad,
    }
  }, [placedUas, placedCuas, cursor.lat, cursor.lon])
  const mapBuildings = useMapBuildings(buildingBounds, placedCuas.length > 0 || placedUas.length > 0)
  const { windByUas, loading: windLoading } = useWindData(nilWind, placedUas, setPlacedUas)
  useEnvelopeWalls(nilWind, placedUas, getCesium, setPlacedUas)

  const panelUas = useMemo(
    () => placedUas.find((u) => !u.infoPanelClosed) ?? null,
    [placedUas]
  )

  const flightDetailsUas = useMemo(() => {
    if (selectedLaydownItem?.kind === 'uas') {
      return placedUas.find((u) => u.instanceId === selectedLaydownItem.instanceId) ?? null
    }
    return placedUas.find((u) => u.mission) ?? null
  }, [placedUas, selectedLaydownItem])

  const overlapLegend = useMemo(
    () => ({
      defeat: overlaps.filter((o) => o.isDefeat).length,
      survivable: overlaps.filter((o) => !o.isDefeat).length,
    }),
    [overlaps]
  )

  const threatAssessments = useMemo(
    () =>
      buildThreatAssessments(
        placedUas,
        placedCuas,
        adjudication.analysis,
        assets.cuas,
        overlaps,
      ),
    [placedUas, placedCuas, adjudication.analysis, assets.cuas, overlaps],
  )

  const laydownState = useMemo(
    () => ({
      placedUas,
      placedCuas,
      placedRadars,
      placedEffectors,
      catalogUas: assets.uas,
      catalogCuas: assets.cuas,
    }),
    [placedUas, placedCuas, placedRadars, placedEffectors, assets.uas, assets.cuas],
  )

  const handleEvaluationItemClick = useCallback(
    (item: EvaluatedItem) => {
      const placed =
        item.instanceId != null
          ? ({ kind: item.kind, instanceId: item.instanceId } as SelectedLaydownItem)
          : resolvePlacedInstance(laydownState, item.kind, item.assetId)
      if (placed) {
        handleSelectPlacedItem(placed)
        return
      }
      handleAddFromEvaluation(item)
    },
    [laydownState, handleSelectPlacedItem, handleAddFromEvaluation],
  )

  const laydownEvaluation = useMemo(
    () => buildLaydownEvaluation(selectedLaydownItem, laydownState),
    [selectedLaydownItem, laydownState],
  )

  const uasCompareRows = useMemo(
    () => (placedUas.length > 1 ? uasCommanderCompare(laydownState) : []),
    [placedUas.length, laydownState],
  )

  const placedLaydownChips = useMemo(() => {
    const nameFor = (item: SelectedLaydownItem) => {
      switch (item.kind) {
        case 'uas': {
          const u = placedUas.find((x) => x.instanceId === item.instanceId)
          return u ? uasCallsign(u) : item.instanceId
        }
        case 'cuas': {
          const c = placedCuas.find((x) => x.instanceId === item.instanceId)
          return c ? cuasCallsign(c) : item.instanceId
        }
        case 'radar': {
          const radar = placedRadars.find((r) => r.instanceId === item.instanceId)
          return radar ? formatRadarDisplayName(radar.asset) : item.instanceId
        }
        case 'effector': {
          const effector = placedEffectors.find((e) => e.instanceId === item.instanceId)
          return effector ? formatEffectorDisplayName(effector.asset) : item.instanceId
        }
      }
    }
    return listPlacedLaydownItems(laydownState).map((item) => ({
      ...item,
      name: nameFor(item),
    }))
  }, [laydownState, placedUas, placedCuas, placedRadars, placedEffectors])

  useEffect(() => {
    const counts = {
      uas: placedUas.length,
      cuas: placedCuas.length,
      radar: placedRadars.length,
      effector: placedEffectors.length,
    }
    const total = counts.uas + counts.cuas + counts.radar + counts.effector
    if (total === 0) {
      setSelectedLaydownItem(null)
      prevPlacedCountsRef.current = counts
      return
    }

    const items = listPlacedLaydownItems(laydownState)
    const stillValid = selectedLaydownItem && items.some((i) => isSameLaydownItem(i, selectedLaydownItem))

    if (!stillValid) {
      if (counts.uas > prevPlacedCountsRef.current.uas) {
        const last = placedUas[placedUas.length - 1]
        setSelectedLaydownItem({ kind: 'uas', instanceId: last.instanceId })
      } else if (counts.cuas > prevPlacedCountsRef.current.cuas) {
        const last = placedCuas[placedCuas.length - 1]
        setSelectedLaydownItem({ kind: 'cuas', instanceId: last.instanceId })
      } else if (counts.radar > prevPlacedCountsRef.current.radar) {
        const last = placedRadars[placedRadars.length - 1]
        setSelectedLaydownItem({ kind: 'radar', instanceId: last.instanceId })
      } else if (counts.effector > prevPlacedCountsRef.current.effector) {
        const last = placedEffectors[placedEffectors.length - 1]
        setSelectedLaydownItem({ kind: 'effector', instanceId: last.instanceId })
      } else {
        setSelectedLaydownItem(items[items.length - 1] ?? null)
      }
    }

    prevPlacedCountsRef.current = counts
  }, [placedUas, placedCuas, placedRadars, placedEffectors, laydownState, selectedLaydownItem])

  const handleGlobeClick = useCallback(
    async (lon: number, lat: number) => {
      if (riskMode !== 'none') {
        await repositionRiskAt(lon, lat)
        return
      }
      if (placementMode.active && placementMode.kind === 'mission-goal') {
        await placeMissionGoal(lon, lat)
        return
      }
      if (placementMode.active && placementMode.kind === 'loiter') {
        await placeLoiterWaypoint(lon, lat)
        return
      }
      await placeAt(lon, lat)
    },
    [placementMode, placeAt, placeLoiterWaypoint, placeMissionGoal, riskMode, repositionRiskAt]
  )

  const handleClearAll = useCallback(() => {
    setPlacedUas([])
    setPlacedCuas([])
    setPlacedRadars([])
    setPlacedEffectors([])
    setPlacementMode({ active: false })
  }, [])

  const handleRemoveUas = useCallback((instanceId: string) => {
    setPlacedUas((prev) => prev.filter((u) => u.instanceId !== instanceId))
    setPlacementMode((mode) => {
      if (
        mode.active &&
        (mode.kind === 'loiter' || mode.kind === 'mission-goal') &&
        mode.uasInstanceId === instanceId
      ) {
        return { active: false }
      }
      return mode
    })
  }, [])

  const handleRemoveCuas = useCallback((instanceId: string) => {
    setPlacedCuas((prev) => prev.filter((c) => c.instanceId !== instanceId))
  }, [])

  const handleRemoveRadar = useCallback((instanceId: string) => {
    setPlacedRadars((prev) => prev.filter((r) => r.instanceId !== instanceId))
  }, [])

  const handleRemoveEffector = useCallback((instanceId: string) => {
    setPlacedEffectors((prev) => prev.filter((e) => e.instanceId !== instanceId))
  }, [])

  const closePanel = useCallback((instanceId: string) => {
    setPlacedUas((prev) =>
      prev.map((u) =>
        u.instanceId === instanceId ? { ...u, infoPanelClosed: true } : u
      )
    )
  }, [])

  const handleTerrainHeightsResolved = useCallback((update: TerrainHeightUpdate) => {
    if (update.uas.length || update.loiter.length) {
      setPlacedUas((prev) =>
        prev.map((u) => {
          const uasHit = update.uas.find((h) => h.instanceId === u.instanceId)
          const loiterHit = update.loiter.find((h) => h.uasInstanceId === u.instanceId)
          if (!uasHit && !loiterHit) return u
          return {
            ...u,
            ...(uasHit
              ? {
                  terrainAMSL: uasHit.terrainAMSL,
                  ceilingAMSL_m: uasHit.terrainAMSL + u.asset.max_altitude_agl_m,
                  discAltitude_m: envelopeDiscAltitudeM(
                    uasHit.terrainAMSL,
                    u.asset.max_altitude_agl_m,
                    u.asset.altitude_reference,
                  ),
                }
              : {}),
            ...(loiterHit && u.loiter
              ? { loiter: { ...u.loiter, terrainAMSL: loiterHit.terrainAMSL } }
              : {}),
          }
        })
      )
    }
    if (update.cuas.length) {
      setPlacedCuas((prev) =>
        prev.map((c) => {
          const hit = update.cuas.find((h) => h.instanceId === c.instanceId)
          if (!hit) return c
          return { ...c, terrainAMSL: hit.terrainAMSL }
        })
      )
    }
    if (update.radars.length) {
      setPlacedRadars((prev) =>
        prev.map((r) => {
          const hit = update.radars.find((h) => h.instanceId === r.instanceId)
          if (!hit) return r
          return { ...r, terrainAMSL: hit.terrainAMSL }
        })
      )
    }
    if (update.effectors.length) {
      setPlacedEffectors((prev) =>
        prev.map((e) => {
          const hit = update.effectors.find((h) => h.instanceId === e.instanceId)
          if (!hit) return e
          return { ...e, terrainAMSL: hit.terrainAMSL }
        })
      )
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (flightPathEditActive) {
          setFlightPathEditActive(false)
          setMissionNotice(null)
          setWaypointContextMenu(null)
          return
        }
        cancelPlacement()
        setPlatformContextMenu(null)
        setWaypointContextMenu(null)
        return
      }
      if (
        e.key.toLowerCase() === 's' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        (placedUas.length > 0 || placedCuas.length > 0) &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        setSpectralOpen(true)
      }
      if (
        e.key.toLowerCase() === 'h' &&
        !e.metaKey &&
        !e.ctrlKey &&
        placedCuas.length > 0 &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        setHeatmapEnabled((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelPlacement, flightPathEditActive, placedUas.length, placedCuas.length])


  useEffect(() => {
    if (searchParams.get('from') !== 'defeat') return
    const cuasId = searchParams.get('cuas')
    const stageId = searchParams.get('stage')
    const highlight: string[] = []
    if (stageId) {
      const uas = assets.uas.find((a) => a.id === stageId)
      if (uas) {
        startUasPlacement(uas)
        highlight.push(stageId)
      }
    }
    if (cuasId) {
      const cuas = assets.cuas.find((a) => a.id === cuasId)
      if (cuas) {
        startCuasPlacement(cuas)
        highlight.push(cuasId)
      }
    }
    if (highlight.length) setHighlightedIds(highlight)
    if (stageId || cuasId) setSpectralOpen(true)
  }, [searchParams, assets.uas, assets.cuas, startUasPlacement, startCuasPlacement])

  /** Replace the laydown with a preset (combat team, base defence, deployed base). */
  const loadPreset = useCallback(
    (id: LaydownPresetId, opts: { name?: string; openFratricide?: boolean } = {}) => {
      const preset = buildPresetLaydown(id, assets)
      setPlacementMode({ active: false })
      setSelectedLaydownItem(null)
      setFratSelectedId(null)
      setPlacedUas(preset.placedUas)
      setPlacedCuas(preset.placedCuas)
      setPlacedRadars(preset.placedRadars)
      setPlacedEffectors(preset.placedEffectors)
      planner.setPlanName(opts.name ?? preset.name)
      setPendingView(preset.viewport)
      const short = (w: string) => w.replace(/\s*\([^)]*\)\s*$/, '')
      const standIns = [
        ...new Set(preset.resolution.filter((r) => r.fallback && !r.used.startsWith('not in')).map((r) => short(r.wanted))),
      ]
      const missing = preset.resolution.filter((r) => r.used.startsWith('not in')).map((r) => short(r.wanted))
      setPresetBanner({ name: opts.name ?? preset.name, standIns, missing })
      if (opts.openFratricide) {
        closeRiskOverlay()
        setShowIadsPanel(false)
        setMapTool('fratricide')
      }
    },
    // planner.setPlanName is a stable state setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assets, closeRiskOverlay],
  )

  const handleLoadPreset = useCallback(
    (id: string) => {
      const hasLaydown = placedUas.length + placedCuas.length + placedRadars.length + placedEffectors.length > 0
      if (hasLaydown && !window.confirm('Load the preset? This replaces the placed assets.')) return
      loadPreset(id as LaydownPresetId, { openFratricide: id === 'combat-team' })
    },
    [loadPreset, placedUas.length, placedCuas.length, placedRadars.length, placedEffectors.length],
  )

  const vignetteHandledRef = useRef<string | null>(null)
  useEffect(() => {
    const vignetteId = searchParams.get('planVignette')
    if (!vignetteId || vignetteHandledRef.current === vignetteId) return
    const v = getVignette(vignetteId)
    if (!v) return
    vignetteHandledRef.current = vignetteId
    if (v.preset) {
      loadPreset(v.preset, { name: v.name, openFratricide: v.openTool === 'fratricide' })
      return
    }
    const doc = vignetteToLaydown(v)
    const hydrated = hydrateLaydown(doc, assets)
    setPlacedUas(hydrated.placedUas)
    setPlacedCuas(hydrated.placedCuas)
    setPlacedRadars(hydrated.placedRadars)
    setPlacedEffectors(hydrated.placedEffectors)
    planner.setPlanName(v.name)
    if (doc.viewport) setPendingView(doc.viewport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, assets, loadPreset])

  /** Fly to a look-at point with a 60 degree oblique view (instant under reduced motion). */
  const flyToView = useCallback((v: { lon: number; lat: number; height_m?: number }) => {
    const ctx = cesiumCtxRef.current
    if (!ctx || ctx.viewer.isDestroyed?.()) return false
    const { Cesium, viewer } = ctx
    const h = Math.max(1500, v.height_m ?? 40_000)
    const pitchDeg = 60
    const back_m = h / Math.tan((pitchDeg * Math.PI) / 180)
    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(v.lon, v.lat - back_m / 111_320, h),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-pitchDeg), roll: 0 },
      duration: reduce ? 0 : 1.8,
    })
    return true
  }, [])

  useEffect(() => {
    if (!pendingView || !cesiumReady) return
    if (flyToView(pendingView)) setPendingView(null)
  }, [pendingView, cesiumReady, flyToView])

  /** ?lat=&lon=[&h=] opens the globe on a place (Base Protection sites link here). */
  useEffect(() => {
    const lat = Number(searchParams.get('lat'))
    const lon = Number(searchParams.get('lon'))
    if (!searchParams.has('lat') || !searchParams.has('lon')) return
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return
    const h = Number(searchParams.get('h'))
    setPendingView({ lat, lon, height_m: Number.isFinite(h) && h > 0 ? h : 12_000 })
  }, [searchParams])

  /* ---------------- spectrum fratricide ---------------- */

  const fratricideReport = useMemo(
    () => runLaydownFratricide(placedUas, placedCuas, fratOptions),
    [placedUas, placedCuas, fratOptions],
  )
  const fratVisible = useMemo(
    () =>
      fratricideReport.conflicts.filter((c) =>
        fratView === 'all' ? true : fratView === 'fratricide' ? c.kind === 'fratricide' : c.kind === 'enemy_ew',
      ),
    [fratricideReport.conflicts, fratView],
  )
  const fratHasEdits = useMemo(
    () => placedUas.some((u) => u.linkPlan) || placedCuas.some((c) => c.emcon),
    [placedUas, placedCuas],
  )

  useEffect(() => {
    const ctx = cesiumCtxRef.current
    if (!cesiumReady || !ctx || ctx.viewer.isDestroyed?.()) return
    if (mapTool === 'fratricide') syncFratricideLayer(ctx.Cesium, ctx.viewer, fratVisible, fratSelectedId)
    else clearFratricideLayer(ctx.viewer)
  }, [cesiumReady, mapTool, fratVisible, fratSelectedId])

  const handleSelectConflict = useCallback(
    (c: FratricideConflict | null) => {
      setFratSelectedId(c?.id ?? null)
      if (!c || c.path.length === 0) return
      const pts = [...c.path, ...c.groundReceivers, c.jammerPosition]
      const lons = pts.map((p) => p.lon)
      const lats = pts.map((p) => p.lat)
      const spanKm = Math.max(
        (Math.max(...lats) - Math.min(...lats)) * 111,
        (Math.max(...lons) - Math.min(...lons)) * 111 * Math.cos((lats[0] * Math.PI) / 180),
      )
      flyToView({
        lon: (Math.max(...lons) + Math.min(...lons)) / 2,
        lat: (Math.max(...lats) + Math.min(...lats)) / 2,
        height_m: Math.max(4000, spanKm * 1000 * 1.6),
      })
    },
    [flyToView],
  )

  const handleApplyMitigation = useCallback(
    (patch: MitigationPatch, label: string) => {
      const next = applyMitigationPatch({ placedUas, placedCuas }, patch)
      if (next.placedUas !== placedUas) setPlacedUas(next.placedUas)
      if (next.placedCuas !== placedCuas) setPlacedCuas(next.placedCuas)
      setFratSelectedId(null)
      toast.success(`Applied: ${label}`)
    },
    [placedUas, placedCuas],
  )

  const handleClearMitigations = useCallback(() => {
    const next = clearMitigations({ placedUas, placedCuas })
    setPlacedUas(next.placedUas)
    setPlacedCuas(next.placedCuas)
  }, [placedUas, placedCuas])

  /* ---------------- exports ---------------- */

  const handleExport = useCallback(
    (id: string) => {
      const format = id as ExportFormat
      const doc = buildExportDocument({
        title: planner.planName && planner.planName !== 'Untitled plan' ? planner.planName : 'Map Intel laydown',
        placedUas,
        placedCuas,
        placedRadars,
        placedEffectors,
        conflicts: fratricideReport.conflicts,
      })
      if (doc.items.length === 0) {
        toast.error('Nothing to export yet. Place assets or load a preset.')
        return
      }
      const file = renderExport(format, doc)
      const blob = new Blob([file.data as BlobPart], { type: file.mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 4000)
      const label = EXPORT_FORMATS.find((f) => f.id === format)?.label ?? format
      toast.success(`${label}: ${doc.items.length} assets exported`)
    },
    [planner.planName, placedUas, placedCuas, placedRadars, placedEffectors, fratricideReport.conflicts],
  )

  const forceHandledRef = useRef(false)
  useEffect(() => {
    if (forceHandledRef.current) return
    if (searchParams.get('from') !== 'force') return
    const theatreId = searchParams.get('forceTheatre')
    if (!theatreId) return
    forceHandledRef.current = true
    const stored = readForcePackage()
    const ids = stored?.selectedIds ?? []
    const q = new URLSearchParams({ theatre: theatreId, ids: ids.join(',') })
    void fetch(`/api/force/package?${q.toString()}`)
      .then((r) => r.json())
      .then((json: { laydown?: Parameters<typeof hydrateLaydown>[0]; theatre?: { name: string }; placed?: number; unmatched?: unknown[] }) => {
        if (!json.laydown) return
        const hydrated = hydrateLaydown(json.laydown, assets)
        setPlacedUas(hydrated.placedUas)
        setPlacedCuas(hydrated.placedCuas)
        setPlacedRadars(hydrated.placedRadars)
        setPlacedEffectors(hydrated.placedEffectors)
        planner.setPlanName(json.theatre?.name ?? 'Force package')
        setForceBanner({
          theatre: json.theatre?.name ?? theatreId,
          placed: json.placed ?? 0,
          unmatched: json.unmatched?.length ?? 0,
        })
        clearForcePackage()
      })
      .catch(() => {
        forceHandledRef.current = false
      })
  }, [searchParams, assets])

  useEffect(() => {
    const planId = searchParams.get('planId') ?? searchParams.get('plan')
    if (planId) void planner.loadPlan(planId)
  }, [searchParams])

  const stagingHandledRef = useRef(false)

  useEffect(() => {
    if (stagingHandledRef.current) return
    if (searchParams.get('from') !== 'spectra') return

    const staging = readMapStaging()
    if (!staging) return

    stagingHandledRef.current = true
    const stagedIds = staging.placeIds ?? staging.highlightIds ?? []
    const resolvedIds = resolveMapStagingIds(stagedIds)
    clearMapStaging()

    const assetIds = new Set([
      ...assets.uas.map((a) => a.id),
      ...assets.cuas.map((a) => a.id),
      ...assets.radars.map((a) => a.id),
      ...assets.effectors.map((a) => a.id),
    ])
    const matched = [...new Set(resolvedIds.filter((id) => assetIds.has(id)))]

    setStagingBanner({ stagedCount: stagedIds.length, matchedCount: matched.length })
    setHighlightedIds(matched)

    const firstId = matched[0]
    if (!firstId) return
    routeCatalogPlacement(firstId)
  }, [searchParams, assets, routeCatalogPlacement])

  const dismissStagingBanner = useCallback(() => {
    setStagingBanner(null)
    clearMapStaging()
  }, [])

  useEffect(() => {
    if (placedUas.length === 0 && placedCuas.length === 0) return
    const pairs = adjudication.analysis.pairs.map((p) => {
      const uas = placedUas.find((u) => u.instanceId === p.uasInstanceId)
      const cuas = placedCuas.find((c) => c.instanceId === p.cuasInstanceId)
      const rangeKm =
        uas && cuas
          ? haversineM(cuas.lat, cuas.lon, uas.lat, uas.lon) / 1000
          : undefined
      return {
        platformId: uas?.asset.id ?? '',
        systemId: cuas?.asset.id ?? '',
        uasInstanceId: p.uasInstanceId,
        cuasInstanceId: p.cuasInstanceId,
        staticPk: p.defeatMatrixPk,
        operationsPk: p.propagation ? p.blueSuccessPct : null,
        jamToSignal_db: p.propagation?.jam_to_signal_db ?? null,
        los_state: p.propagation?.los_state ?? 'n/a',
        propagationGated: p.propagation?.propagationGated ?? false,
        rangeKm,
        uasAltitude_m: uas?.discAltitude_m,
      }
    })
    writeLaydownSession({ updatedAt: new Date().toISOString(), pairs })
  }, [adjudication.analysis, placedUas, placedCuas])

  useEffect(() => {
    const top = toolbarRowRef.current
    const bottom = bottomBarRef.current
    if (!top || !bottom || typeof ResizeObserver === 'undefined') return
    const measure = () =>
      setChromeH((prev) => {
        const next = { top: top.offsetHeight || 42, bottom: bottom.offsetHeight || 42 }
        return prev.top === next.top && prev.bottom === next.bottom ? prev : next
      })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(top)
    ro.observe(bottom)
    return () => ro.disconnect()
  }, [])

  const toolPanelOpen = riskMode !== 'none' || mapTool !== 'none' || showIadsPanel
  const inspectorOpen = toolPanelOpen || laydownEvaluation != null
  // Every overlay anchors to these insets so nothing slides under the asset panel or the inspector.
  const insetLeft = assetPanelOpen ? GUTTER + ASSET_PANEL_W + GUTTER : GUTTER
  const insetRight = inspectorOpen ? GUTTER + INSPECTOR_W + GUTTER : GUTTER
  const stageVars = {
    '--map-l': `${insetLeft}px`,
    '--map-r': `${insetRight}px`,
    '--asset-w': `${ASSET_PANEL_W}px`,
    '--inspector-w': `${INSPECTOR_W}px`,
    '--map-t': `${GUTTER + chromeH.top + 8}px`,
    '--map-b': `${GUTTER + chromeH.bottom + 8}px`,
  } as React.CSSProperties

  const placementText = !placementMode.active
    ? null
    : placementMode.kind === 'mission-goal'
      ? 'Mission goal: click the globe for the target or AOI point. Esc to cancel.'
      : placementMode.kind === 'loiter'
        ? 'Place loiter: click the globe for the loiter point. Esc to cancel.'
        : placementMode.kind === 'radar'
          ? `Placing radar ${formatRadarDisplayName(placementMode.asset)}: click terrain. Esc to cancel.`
          : placementMode.kind === 'effector'
            ? `Placing ${placementMode.asset.tierLabel} ${formatEffectorDisplayName(placementMode.asset)}: click terrain. Esc to cancel.`
            : `Placing ${placementMode.asset.name}: click terrain. Esc to cancel.`

  return (
    <div className="map-intel relative h-full w-full overflow-hidden">
      <SpectralAnalysisPanel
        open={spectralOpen}
        onOpenChange={setSpectralOpen}
        placedUas={placedUas}
        placedCuas={placedCuas}
        placedRadars={placedRadars}
        placedEffectors={placedEffectors}
        threatAssessments={threatAssessments}
        catalogCuas={assets.cuas}
        overlaps={overlaps}
        analysis={adjudication.analysis}
        adjudicationSource={adjudication.source}
        fallbackReason={adjudication.fallbackReason}
        laydownEvaluation={laydownEvaluation}
        selectedLaydownItem={selectedLaydownItem}
      />

      <PlanLoadDialog
        open={loadPlanOpen}
        onClose={() => setLoadPlanOpen(false)}
        onSelect={(id) => {
          void planner.loadPlan(id).then((ok) => {
            if (ok) setLoadPlanOpen(false)
            else toast.error('Could not load plan')
          })
        }}
      />

      {/* Stage: the globe fills the route; every control floats over it as Liquid Glass. */}
      <div className="absolute inset-0" style={stageVars}>
        <CesiumMapPanel
          placedUas={placedUas}
          placedCuas={placedCuas}
          placedRadars={placedRadars}
          placedEffectors={placedEffectors}
          selectedLaydownItem={selectedLaydownItem}
          onSelectPlacedItem={handleSelectPlacedItem}
          overlaps={overlaps}
          maskingPolygons={maskingPolygons}
          heatmapCells={heatmap.cells}
          heatmapGridSteps={heatmap.gridSteps}
          heatmapJammer={heatmapJammer}
          buildingFootprints={mapBuildings.buildings}
          windByUas={windByUas}
          nilWind={nilWind}
          placementMode={placementMode}
          panelUasId={panelUas?.instanceId ?? null}
          onCesiumReady={onCesiumReady}
          onGlobeClick={handleGlobeClick}
          onCursorMove={setCursor}
          onPanelScreenPos={setPanelScreenPos}
          onTerrainHeightsResolved={handleTerrainHeightsResolved}
          onTerrainEpochChange={setTerrainEpoch}
          setPlacedUas={setPlacedUas}
          setPlacedCuas={setPlacedCuas}
          onPlatformContextMenu={setPlatformContextMenu}
          onWaypointContextMenu={setWaypointContextMenu}
          flightPathEditActive={flightPathEditActive}
          onWaypointDragEnd={(uasInstanceId, waypointId, lon, lat) => {
            void updateWaypoint(uasInstanceId, waypointId, { lon, lat }).then((result) => {
              if (!result.ok) setMissionNotice(result.reason)
            })
          }}
          onAddWaypointOnPath={(uasInstanceId, lon, lat, segmentIndex) => {
            void addWaypointOnPath(uasInstanceId, lon, lat, segmentIndex).then((result) => {
              if (!result.ok) setMissionNotice(result.reason)
              else setMissionNotice(null)
            })
          }}
        />

        {assetPanelOpen && (
          <AssetSidebar
            className="absolute z-20 left-3 top-3 max-h-[calc(100%-24px)] w-[var(--asset-w)]"
            onHide={() => setAssetPanelOpen(false)}
            assets={assets}
            placedUas={placedUas}
            placedCuas={placedCuas}
            selectedLaydownItem={selectedLaydownItem}
            onSelectPlacedItem={handleSelectPlacedItem}
            placementMode={placementMode}
            highlightedIds={highlightedIds}
            onSelectUas={handleSelectUas}
            onSelectCuas={startCuasPlacement}
            onPlaceLoiter={startLoiterMode}
            onClearLoiter={clearLoiter}
            onReplanMission={(id) => void replanMission(id, { clearManualOverride: true })}
            onClearMission={clearMission}
            onMissionEmcon={setEmcon}
            onMissionRouteObjective={setRouteObjective}
            rcsOverrides={rcsOverrides}
            onRcsChange={handleRcsChange}
            onRemoveUas={handleRemoveUas}
            onRemoveCuas={handleRemoveCuas}
            placedRadars={placedRadars}
            placedEffectors={placedEffectors}
            onSelectRadar={startRadarPlacement}
            onSelectEffector={startEffectorPlacement}
            onRemoveRadar={handleRemoveRadar}
            onRemoveEffector={handleRemoveEffector}
            overlapLegend={overlapLegend}
            overlapSource={overlapSource}
            heatmapEnabled={heatmapEnabled}
            heatmapLoading={heatmap.loading}
            heatmapError={heatmap.error}
            onToggleHeatmap={() => setHeatmapEnabled((v) => !v)}
            onOpenSpectralAnalysis={() => setSpectralOpen(true)}
          />
        )}

        {/* Top row: plan on the left, analysis tools on the right. */}
        <div
          ref={toolbarRowRef}
          className="absolute z-30 top-3 left-[var(--map-l)] right-3 flex flex-wrap items-start gap-2 pointer-events-none"
        >
          {!assetPanelOpen && (
            <button
              type="button"
              onClick={() => setAssetPanelOpen(true)}
              className="lg-glass pointer-events-auto inline-flex items-center gap-2 h-[42px] px-3.5 text-[13px] text-[var(--store-ink)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              aria-label="Show asset panel"
            >
              <PanelLeftOpen className="w-4 h-4" />
              Assets
            </button>
          )}
          <div
            className="lg-glass pointer-events-auto flex items-center p-1 shrink-0 [&_.btn-e]:!min-h-8 [&_.btn-e]:!text-[13px] [&_.btn-e]:!px-2.5 [&_.btn-e]:![font-family:inherit]"
            role="toolbar"
            aria-label="Plan"
          >
            <PlannerToolbar
              planName={planner.planName}
              planId={planner.planId}
              saving={planner.saving}
              lastSaved={planner.lastSaved}
              error={planner.error}
              onSave={() => void planner.savePlan()}
              onNew={() => {
                const hasLaydown =
                  placedUas.length + placedCuas.length + placedRadars.length + placedEffectors.length > 0
                if (hasLaydown && !window.confirm('Start a new plan? This clears all placed assets.')) return
                planner.newPlan()
              }}
              onLoadClick={() => setLoadPlanOpen(true)}
              onPublishWopr={() => {
                void planner
                  .publishWopr()
                  .then((id) => {
                    if (id) window.location.href = `/arena?scenario=${id}`
                    else toast.error('WOPR publish failed. Save the plan and try again.')
                  })
                  .catch((e) => toast.error(e instanceof Error ? e.message : 'WOPR publish failed'))
              }}
              onPublishPcm={() => {
                void planner
                  .publishPcm()
                  .then((id) => {
                    if (id) window.location.href = `/pcm/exercise/${id}`
                    else toast.error('PCM publish failed. Save the plan and try again.')
                  })
                  .catch((e) => toast.error(e instanceof Error ? e.message : 'PCM publish failed'))
              }}
            />
            <span className="lg-sep" aria-hidden />
            <MapMenu
              label={
                <>
                  <Download className="w-3.5 h-3.5" aria-hidden />
                  Export
                </>
              }
              menuLabel="Export laydown"
              header="Download the current laydown for the tactical picture"
              buttonClassName="btn-e sm inline-flex items-center gap-1.5"
              width={340}
              items={EXPORT_FORMATS.map((f) => ({
                id: f.id,
                label: (
                  <>
                    {f.label} <span className="font-mono text-[12px] store-text-muted">.{f.ext}</span>
                  </>
                ),
                note: f.note,
              }))}
              onSelect={handleExport}
            />
          </div>
          <div
            className="lg-glass pointer-events-auto ml-auto flex items-center gap-0.5 p-1 shrink-0"
            role="toolbar"
            aria-label="Map tools"
          >
            <button
              type="button"
              aria-pressed={riskMode === 'blast'}
              onClick={() => (riskMode === 'blast' ? closeRiskOverlay() : activateBlastRisk())}
              className={mapToolbarBtn(riskMode === 'blast')}
            >
              Blast
            </button>
            <button
              type="button"
              aria-pressed={riskMode === 'jamming'}
              onClick={() => (riskMode === 'jamming' ? closeRiskOverlay() : activateJammingRisk())}
              className={mapToolbarBtn(riskMode === 'jamming')}
            >
              EW Jam
            </button>
            <button
              type="button"
              aria-pressed={mapTool === 'cuas-siting'}
              onClick={() => {
                closeRiskOverlay()
                setMapTool((t) => (t === 'cuas-siting' ? 'none' : 'cuas-siting'))
              }}
              className={mapToolbarBtn(mapTool === 'cuas-siting')}
            >
              C-UAS Siting
            </button>
            <button
              type="button"
              aria-pressed={mapTool === 'ew-deconflict'}
              onClick={() => {
                closeRiskOverlay()
                setMapTool((t) => (t === 'ew-deconflict' ? 'none' : 'ew-deconflict'))
              }}
              className={mapToolbarBtn(mapTool === 'ew-deconflict')}
            >
              EW Deconflict
            </button>
            <button
              type="button"
              aria-pressed={mapTool === 'fratricide'}
              onClick={() => {
                closeRiskOverlay()
                setMapTool((t) => (t === 'fratricide' ? 'none' : 'fratricide'))
              }}
              className={mapToolbarBtn(mapTool === 'fratricide')}
              title="Own jammers against own drone links"
            >
              Fratricide
              {fratricideReport.counts.fratricide > 0 ? (
                <span
                  className={cn(
                    'ml-1 font-mono text-[12px] tabular-nums',
                    mapTool === 'fratricide' ? 'text-white' : 'text-[#FF8A98]',
                  )}
                  aria-label={`${fratricideReport.counts.fratricide} conflicts`}
                >
                  {fratricideReport.counts.fratricide}
                </span>
              ) : null}
            </button>
            <span className="lg-sep" aria-hidden />
            <button
              type="button"
              aria-pressed={showIadsPanel}
              onClick={() => setShowIadsPanel((v) => !v)}
              className={mapToolbarBtn(showIadsPanel)}
            >
              IADS
            </button>
          </div>
        </div>

        {/* Status banners: one centred stack under the toolbars, clear of both side columns. */}
        <div className="absolute z-30 top-[var(--map-t)] left-[var(--map-l)] right-[var(--map-r)] flex flex-col items-center gap-2 pointer-events-none">
          {stagingBanner && (
            <div className="glass-popover pointer-events-auto w-full max-w-xl pl-4 pr-2 py-2 flex items-start justify-between gap-3 text-[12px] store-text-body leading-relaxed">
              <span className="py-1">
                AeroCopilot staged {stagingBanner.stagedCount} system
                {stagingBanner.stagedCount === 1 ? '' : 's'}: {stagingBanner.matchedCount} matched Map Intel asset
                {stagingBanner.matchedCount === 1 ? '' : 's'} (unmatched SPECTRA IDs stay in staging). Highlighted in
                the asset panel.
              </span>
              <button
                type="button"
                onClick={dismissStagingBanner}
                className="glass-icon-btn !w-7 !h-7 !rounded-lg shrink-0"
                aria-label="Dismiss staging banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {forceBanner && (
            <div className="glass-popover pointer-events-auto w-full max-w-xl pl-4 pr-2 py-2 flex items-start justify-between gap-3 text-[12px] store-text-body leading-relaxed">
              <span className="py-1">
                Force package, {forceBanner.theatre}: {forceBanner.placed} envelopes placed
                {forceBanner.unmatched > 0
                  ? `. ${forceBanner.unmatched} ORBAT types have no map model (Estimated, listed only)`
                  : ''}
                . Continue in Arena or PCM for the work-up, not a campaign auto-play.
              </span>
              <button
                type="button"
                onClick={() => setForceBanner(null)}
                className="glass-icon-btn !w-7 !h-7 !rounded-lg shrink-0"
                aria-label="Dismiss force package banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {presetBanner && (
            <div className="glass-popover pointer-events-auto w-full max-w-xl pl-4 pr-2 py-2 flex items-start justify-between gap-3 text-[12px] store-text-body leading-relaxed">
              <span className="py-1">
                {presetBanner.name} loaded. Notional positions.
                {presetBanner.standIns.length > 0
                  ? ` Stand-in specs (not in the live catalogue): ${presetBanner.standIns.join(', ')}.`
                  : ''}
                {presetBanner.missing.length > 0 ? ` Left out: ${presetBanner.missing.join(', ')}.` : ''}
              </span>
              <button
                type="button"
                onClick={() => setPresetBanner(null)}
                className="glass-icon-btn !w-7 !h-7 !rounded-lg shrink-0"
                aria-label="Dismiss preset banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {placementText && (
            <div className="glass-popover pointer-events-auto max-w-xl px-4 py-2 text-[12px] font-medium text-[#6CB8FF] text-center">
              {placementText}
            </div>
          )}
          {flightPathEditActive && !placementMode.active && (
            <div className="glass-popover pointer-events-auto max-w-xl px-4 py-2 text-[12px] font-medium text-[#6CB8FF] text-center">
              Flight path edit: right-click the line to add a waypoint, drag waypoints, right-click a waypoint for
              altitude. Esc to exit.
            </div>
          )}
          {heatmapEnabled && !heatmap.loading && (
            <div
              className={cn(
                'glass-popover max-w-xl px-4 py-2 text-[12px] font-mono',
                heatmap.error ? 'text-[#FCD34D]' : 'text-[#67E8F9]',
              )}
            >
              {heatmap.error
                ? heatmap.error
                : !placedCuas.some((c) => c.asset.defeat_methods.includes('RF_jamming'))
                  ? 'No jammer with RF band placed. Place a C-UAS with RF jamming.'
                  : heatmap.cells.length === 0
                    ? 'Jam heatmap: no coverage cells returned'
                    : `Jam coverage heatmap: ${heatmap.cells.length} cells around ${heatmapJammer?.asset.name ?? 'jammer'}`}
            </div>
          )}
          {missionNotice && (
            <div
              className="glass-popover pointer-events-auto max-w-xl pl-4 pr-2 py-2 flex items-start justify-between gap-3 text-[12px] font-mono text-[#FCD34D] leading-relaxed"
              role="status"
            >
              <span className="py-1">{missionNotice}</span>
              <button
                type="button"
                className="glass-icon-btn !w-7 !h-7 !rounded-lg shrink-0"
                onClick={() => setMissionNotice(null)}
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Left column over the globe: flight details above the camera cluster. */}
        <div className="absolute z-20 top-[var(--map-t)] bottom-[var(--map-b)] left-[var(--map-l)] w-80 max-w-[calc(100%-var(--map-l)-var(--map-r)-8px)] flex flex-col justify-end gap-2 pointer-events-none">
          {flightDetailsUas?.mission && (
            <div
              role="region"
              aria-label="Flight and encounter assessment"
              className="pointer-events-auto min-h-0 w-full overflow-y-auto overscroll-y-contain flex flex-col gap-2 rounded-[14px] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent]"
              onWheel={(e) => e.stopPropagation()}
            >
              <FlightDetailsPanel
                uas={flightDetailsUas}
                placedCuas={placedCuas}
                placedRadars={placedRadars}
                placedEffectors={placedEffectors}
                onReplan={() => void replanMission(flightDetailsUas.instanceId, { clearManualOverride: true })}
              />
              <EncounterAssessmentPanel
                uas={flightDetailsUas}
                placedCuas={placedCuas}
                placedRadars={placedRadars}
                placedEffectors={placedEffectors}
                overlaps={overlaps}
                populationTier={riskPopTier}
                timeOfDay={riskTimeOfDay}
                buildingProtection={riskProtection}
                warheadOverride={selectedWarhead}
                onPopulationTierChange={setRiskPopTier}
                onTimeOfDayChange={setRiskTimeOfDay}
                onBuildingProtectionChange={setRiskProtection}
                onOpenBlastTool={() => openBlastAtMissionTarget(flightDetailsUas)}
              />
            </div>
          )}
          <div className="pointer-events-auto shrink-0 self-start">
            <MapNavigationWheel getCesium={getCesium} embedded />
          </div>
        </div>

        {/* Inspector column: the open analysis tool, otherwise the laydown evaluation. */}
        {inspectorOpen && (
          <div className="absolute z-20 top-[var(--map-t)] bottom-[var(--map-b)] right-3 w-[var(--inspector-w)] max-w-[calc(100%-24px)] flex flex-col gap-2 pointer-events-none">
            {riskMode !== 'none' && (
              <CollateralRiskPanel
                mode={riskMode}
                blastResult={cdeResult}
                jammingRadii={selectedJammer}
                weaponName={selectedWarhead?.weapon_name}
                jammerName={selectedJammer?.jammer_name}
                warheads={WARHEAD_DB}
                selectedWarheadId={selectedWarhead?.weapon_id ?? null}
                onWarheadChange={(id) => setSelectedWarhead(WARHEAD_DB.find((w) => w.weapon_id === id) ?? null)}
                jammers={JAMMER_DB}
                selectedJammerId={selectedJammer?.jammer_id ?? null}
                onJammerChange={(id) => setSelectedJammer(JAMMER_DB.find((j) => j.jammer_id === id) ?? null)}
                popTier={riskPopTier}
                timeOfDay={riskTimeOfDay}
                buildingProtection={riskProtection}
                onPopTierChange={setRiskPopTier}
                onTimeChange={setRiskTimeOfDay}
                onProtectionChange={setRiskProtection}
                ringShade={riskRingShade}
                onRingShadeChange={setRiskRingShade}
                onClose={closeRiskOverlay}
              />
            )}
            {mapTool === 'cuas-siting' && (
              <CuasSitingPlanner placedUas={placedUas} placedCuas={placedCuas} onClose={() => setMapTool('none')} />
            )}
            {mapTool === 'fratricide' && (
              <FratricidePanel
                report={fratricideReport}
                options={fratOptions}
                onOptionsChange={(patch) => setFratOptions((o) => ({ ...o, ...patch }))}
                selectedId={fratSelectedId}
                onSelect={handleSelectConflict}
                onApply={handleApplyMitigation}
                hasEdits={fratHasEdits}
                onClearEdits={handleClearMitigations}
                view={fratView}
                onViewChange={setFratView}
                onClose={() => setMapTool('none')}
              />
            )}
            {mapTool === 'ew-deconflict' && (
              <EwFootprintAnalyser
                placedUas={placedUas}
                placedCuas={placedCuas}
                emitterLon={cursor.lon}
                emitterLat={cursor.lat}
                onClose={() => setMapTool('none')}
              />
            )}
            {showIadsPanel && (
              <MapCard title="IADS stacks" icon={<Layers className="w-4 h-4" />} onClose={() => setShowIadsPanel(false)}>
                <IadsStackPanel
                  assets={assets}
                  onApply={({ radars, effectors, cuas }) => {
                    setPlacedRadars((p) => [...p, ...radars])
                    setPlacedEffectors((p) => [...p, ...effectors])
                    setPlacedCuas((p) => [...p, ...cuas])
                  }}
                />
              </MapCard>
            )}
            {!toolPanelOpen && (
              <LaydownEvaluationPanel
                evaluation={laydownEvaluation}
                placedItems={placedLaydownChips}
                selectedItem={selectedLaydownItem}
                onSelectItem={handleSelectPlacedItem}
                onEvalItemClick={handleEvaluationItemClick}
                adjudicationSource={adjudication.source}
                compareRows={uasCompareRows}
              />
            )}
          </div>
        )}

        <div ref={bottomBarRef} className="absolute z-30 bottom-3 left-[var(--map-l)] right-3">
        <MapBottomBar
          className="w-full flex-wrap"
          cursor={cursor}
          nilWind={nilWind}
          windLoading={windLoading}
          onNilWindChange={setNilWind}
          onClearAll={handleClearAll}
          tools={
            <>
              <button
                type="button"
                aria-pressed={flightPathEditActive}
                disabled={placedUas.length === 0}
                onClick={toggleFlightPathEdit}
                className={mapToolbarBtn(flightPathEditActive)}
                title={placedUas.length === 0 ? 'Place a UAS first' : 'Edit flight paths'}
              >
                <Route className="w-3.5 h-3.5" />
                Edit flight path
              </button>
              <MapMenu
                label={
                  <>
                    <LayoutTemplate className="w-3.5 h-3.5" aria-hidden />
                    Presets
                  </>
                }
                menuLabel="Laydown presets"
                header="Replaces the placed assets"
                placement="up"
                buttonClassName={mapToolbarBtn(false)}
                width={320}
                items={LAYDOWN_PRESETS.map((p) => ({ id: p.id, label: p.label, note: p.hint }))}
                onSelect={handleLoadPreset}
              />
            </>
          }
        />
        </div>

        {platformContextMenu && (
          <PlatformContextMenu
            target={platformContextMenu}
            onAdd={() => duplicateAdjacent(platformContextMenu.kind, platformContextMenu.instanceId)}
            onClose={() => setPlatformContextMenu(null)}
          />
        )}

        {pendingMissionUas && (
          <MissionGoalDialog
            uas={pendingMissionUas}
            onSelect={(kind) => {
              startMissionGoal(pendingMissionUas, kind)
              setPendingMissionUasId(null)
            }}
            onDismiss={() => {
              suppressAutoPlan(pendingMissionUas.instanceId)
              setPendingMissionUasId(null)
            }}
          />
        )}

        {waypointContextMenu && (
          <WaypointContextMenu
            target={waypointContextMenu}
            onApply={(patch) => {
              void updateWaypoint(waypointContextMenu.uasInstanceId, waypointContextMenu.waypointId, patch).then(
                (result) => {
                  if (!result.ok) {
                    setMissionNotice(result.reason)
                    return
                  }
                  setMissionNotice(null)
                  setWaypointContextMenu(null)
                },
              )
            }}
            onClose={() => setWaypointContextMenu(null)}
          />
        )}

        {panelUas && panelScreenPos && (
          <EntityInfoPanel
            uas={panelUas}
            placedCuas={placedCuas}
            placedRadars={placedRadars}
            placedEffectors={placedEffectors}
            screenX={panelScreenPos.x}
            screenY={panelScreenPos.y}
            onClose={() => closePanel(panelUas.instanceId)}
          />
        )}
      </div>
    </div>
  )
}
