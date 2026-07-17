import type { DashboardCopy } from '@/lib/dashboard/adapters'
import type { ImportJob } from '@/lib/operations/import'
import type { BattlespacePlanRow, PersistedPlacedUas } from '@/lib/planner/battlespace-plan'
import type {
  DashboardMetrics,
  LiveMapContext,
  MapTrackPoint,
  OperationalStatus,
  OperatorRow,
  TrackedAsset,
} from '@/lib/dashboard/types'
import type { WoprScenario } from '@/lib/wopr/types'
import {
  DEMO_ASSETS,
  DEMO_MAP_CONTEXT,
  DEMO_OPERATORS,
  metricsWithCurrencyCount,
} from '@/lib/dashboard/seed-dashboard'
import type { DashboardLiveSnapshot } from '@/lib/dashboard/queries'

export interface BuiltDashboardData {
  metrics: DashboardMetrics
  operators: OperatorRow[]
  assets: TrackedAsset[]
  mapContext: LiveMapContext
  defaultAssetId?: string
  recentPlanId?: string
  mapCenter?: { lon: number; lat: number }
}

export function buildDashboardFromLive(
  snapshot: DashboardLiveSnapshot,
  copy: DashboardCopy,
): BuiltDashboardData {
  const hasLive =
    snapshot.plans.length > 0 ||
    snapshot.woprScenarios.length > 0 ||
    snapshot.importJobs.length > 0

  if (!hasLive && snapshot.pendingCurrency === 0) {
    return {
      metrics: metricsWithCurrencyCount(0),
      operators: DEMO_OPERATORS,
      assets: DEMO_ASSETS,
      mapContext: DEMO_MAP_CONTEXT,
      defaultAssetId: DEMO_ASSETS[0]?.id,
    }
  }

  const metrics = buildMetrics(snapshot, copy)
  const recentPlan = snapshot.recentPlan
  const assets = recentPlan ? assetsFromPlan(recentPlan) : DEMO_ASSETS
  const mapContext = buildMapContext(recentPlan, snapshot.woprScenarios)
  const operators = buildOperators(snapshot, copy)
  const mapCenter = recentPlan?.laydown.viewport ?? inferCenter(recentPlan)

  return {
    metrics,
    operators,
    assets: assets.length ? assets : DEMO_ASSETS,
    mapContext,
    defaultAssetId: assets[0]?.id ?? DEMO_ASSETS[0]?.id,
    recentPlanId: recentPlan?.id,
    mapCenter,
  }
}

function buildMetrics(snapshot: DashboardLiveSnapshot, _copy: DashboardCopy): DashboardMetrics {
  const activeRpa = snapshot.plans.reduce(
    (n, p) => n + p.laydown.uas.length + p.laydown.cuas.length,
    0,
  )
  const activeMissions =
    snapshot.woprScenarios.filter((s) => s.status === 'running' || s.status === 'draft').length +
    snapshot.plans.filter((p) => p.phase === 'rehearse').length

  const pendingImports = snapshot.importJobs.filter(
    (j) => j.status === 'queued' || j.status === 'processing',
  ).length
  const pendingApprovals = pendingImports + snapshot.pendingCurrency

  const criticalAlerts =
    snapshot.importJobs.filter((j) => j.status === 'failed').length +
    (snapshot.pendingCurrency > 0 ? 1 : 0)

  return {
    activeRpa: activeRpa || DEMO_ASSETS.length,
    activeMissions: activeMissions || 1,
    pendingApprovals,
    criticalAlerts: Math.max(criticalAlerts, pendingApprovals > 0 ? 1 : 0),
  }
}

function assetsFromPlan(plan: BattlespacePlanRow): TrackedAsset[] {
  const rows: TrackedAsset[] = []
  plan.laydown.uas.forEach((uas, i) => rows.push(uasToAsset(uas, i, 'red')))
  plan.laydown.cuas.forEach((c, i) =>
    rows.push(effectorToAsset(c.instanceId, c.assetId, i, 'blue', 'idle')),
  )
  plan.laydown.effectors.forEach((e, i) =>
    rows.push(effectorToAsset(e.instanceId, e.assetId, i, 'blue', 'idle')),
  )
  return rows.slice(0, 8)
}

function uasToAsset(uas: PersistedPlacedUas, index: number, side: 'red' | 'blue'): TrackedAsset {
  const hasMission = (uas.mission?.waypoints?.length ?? 0) >= 2
  const status: OperationalStatus = hasMission
    ? 'in-flight'
    : uas.mission?.goalKind
      ? 'pre-flight'
      : 'idle'
  return {
    id: uas.instanceId,
    designation: formatAssetName(uas.assetId),
    serialNumber: `${side === 'red' ? 'RED' : 'BLU'}-UAS-${String(index + 1).padStart(3, '0')}`,
    status,
    batteryHealthPct: clampPct(92 - index * 4 - (hasMission ? 8 : 0)),
    batteryCycles: 6 + index * 3,
    payloadProfile: inferPayload(uas.assetId),
    payloadActive: hasMission || status === 'in-flight',
    operator: 'Map Intel laydown',
    jsaStatus: hasMission ? 'approved' : 'pending',
    platformHref: `/platforms/${uas.assetId}`,
  }
}

function effectorToAsset(
  instanceId: string,
  assetId: string,
  index: number,
  side: 'red' | 'blue',
  status: OperationalStatus,
): TrackedAsset {
  return {
    id: instanceId,
    designation: formatAssetName(assetId),
    serialNumber: `${side === 'red' ? 'RED' : 'BLU'}-EFF-${String(index + 1).padStart(3, '0')}`,
    status,
    batteryHealthPct: clampPct(88 - index * 2),
    batteryCycles: 2 + index,
    payloadProfile: 'Effector · C-UAS defeat chain',
    payloadActive: status === 'in-flight',
    operator: 'Defence laydown',
    jsaStatus: 'approved',
    platformHref: `/platforms/${assetId}`,
  }
}

function buildMapContext(
  plan: BattlespacePlanRow | null,
  scenarios: WoprScenario[],
): LiveMapContext {
  if (!plan) {
    const running = scenarios.find((s) => s.status === 'running')
    if (running) return mapContextFromWopr(running)
    return DEMO_MAP_CONTEXT
  }

  const tracks: MapTrackPoint[] = []
  for (const uas of plan.laydown.uas) {
    if (uas.mission?.waypoints?.length) {
      for (const wp of uas.mission.waypoints) {
        tracks.push({ lon: wp.lon, lat: wp.lat, label: uas.assetId })
      }
    } else {
      tracks.push({ lon: uas.lon, lat: uas.lat, label: uas.assetId })
    }
  }

  let inFlight = 0
  let preFlight = 0
  let idle = 0
  for (const uas of plan.laydown.uas) {
    const hasMission = (uas.mission?.waypoints?.length ?? 0) >= 2
    if (hasMission) inFlight++
    else if (uas.mission?.goalKind) preFlight++
    else idle++
  }
  idle += plan.laydown.cuas.length + plan.laydown.effectors.length + plan.laydown.radars.length

  return {
    tracks: tracks.length ? tracks : DEMO_MAP_CONTEXT.tracks,
    geofenceCount: Math.max(1, plan.laydown.cuas.length),
    inFlight: inFlight || DEMO_MAP_CONTEXT.inFlight,
    preFlight,
    idle: idle || DEMO_MAP_CONTEXT.idle,
  }
}

function mapContextFromWopr(scenario: WoprScenario): LiveMapContext {
  const platforms = [
    ...scenario.world_state.red_orbat.platforms,
    ...scenario.world_state.blue_orbat.platforms,
  ]
  const tracks = platforms.map((p) => ({ lon: p.lon, lat: p.lat, label: p.name }))
  const inFlight = platforms.filter((p) => !p.destroyed && p.side === 'red').length
  return {
    tracks: tracks.length ? tracks : DEMO_MAP_CONTEXT.tracks,
    geofenceCount: scenario.world_state.blue_orbat.platforms.length,
    inFlight,
    preFlight: 0,
    idle: platforms.filter((p) => p.destroyed).length,
  }
}

function buildOperators(snapshot: DashboardLiveSnapshot, copy: DashboardCopy): OperatorRow[] {
  const rows: OperatorRow[] = []
  let i = 0
  for (const scenario of snapshot.woprScenarios.slice(0, 2)) {
    rows.push({
      id: `wopr-${scenario.id}`,
      initials: initialsFromName(scenario.name),
      name: scenario.name.slice(0, 24),
      role: copy.crewPanelTitle.includes('Pilot') ? 'Remote Pilot' : 'WOPR Controller',
      flightCurrency: scenario.status === 'running' ? 'current' : 'due',
      medicalCurrency: 'current',
      currentTask: `Scenario · ${scenario.status} · T+${scenario.elapsed_min} min`,
      href: `/arena?scenario=${scenario.id}`,
    })
    i++
  }
  for (const plan of snapshot.plans.slice(0, 3 - rows.length)) {
    rows.push({
      id: `plan-${plan.id}`,
      initials: initialsFromName(plan.name),
      name: plan.name,
      role: plan.phase === 'rehearse' ? 'Rehearsal lead' : 'Battlespace planner',
      flightCurrency: 'current',
      medicalCurrency: snapshot.pendingCurrency > 0 ? 'due' : 'current',
      currentTask: `${countPlanAssets(plan)} assets · ${plan.phase}`,
      href: `/map?plan=${plan.id}`,
    })
  }
  if (snapshot.pendingCurrency > 0) {
    rows.push({
      id: 'currency-queue',
      initials: 'DS',
      name: 'Currency review queue',
      role: 'Data steward',
      flightCurrency: 'due',
      medicalCurrency: 'current',
      currentTask: `${snapshot.pendingCurrency} proposed TTP updates awaiting review`,
      href: '/currency',
    })
  }
  for (const job of snapshot.importJobs.filter((j) => j.status === 'queued').slice(0, 2)) {
    rows.push({
      id: `import-${job.id}`,
      initials: 'IN',
      name: String(job.payload.name ?? job.job_type),
      role: 'Import pipeline',
      flightCurrency: 'current',
      medicalCurrency: 'current',
      currentTask: `${job.job_type} import · ${job.status}`,
      href: '/operations/import',
    })
  }
  return rows.length ? rows : DEMO_OPERATORS
}

function countPlanAssets(plan: BattlespacePlanRow): number {
  const l = plan.laydown
  return l.uas.length + l.cuas.length + l.radars.length + l.effectors.length
}

function inferCenter(plan: BattlespacePlanRow | null): { lon: number; lat: number } | undefined {
  if (!plan?.laydown.uas[0]) return undefined
  const u = plan.laydown.uas[0]
  return { lon: u.lon, lat: u.lat }
}

function formatAssetName(assetId: string): string {
  return assetId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function inferPayload(assetId: string): string {
  if (assetId.includes('shahed')) return 'OWA warhead · INS/GPS'
  if (assetId.includes('matrice') || assetId.includes('mavic')) return 'EO/IR · LiDAR payload'
  if (assetId.includes('lids')) return 'Ku-band effector · EO cue'
  return 'OSINT catalogue asset'
}

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function clampPct(n: number): number {
  return Math.max(35, Math.min(98, n))
}
