import type { DashboardMetrics, LiveMapContext, OperatorRow, TrackedAsset } from '@/lib/dashboard/types'

/** Synthetic demo rows — training personas only, no real personnel. */
export const DEMO_METRICS: DashboardMetrics = {
  activeRpa: 4,
  activeMissions: 2,
  pendingApprovals: 3,
  criticalAlerts: 1,
}

export const DEMO_OPERATORS: OperatorRow[] = [
  {
    id: 'op-1',
    initials: 'JC',
    name: 'J. Chen',
    role: 'Lead EW Analyst',
    flightCurrency: 'current',
    medicalCurrency: 'current',
    currentTask: 'Laydown adjudication — Map Intel',
    href: '/map',
  },
  {
    id: 'op-2',
    initials: 'MR',
    name: 'M. Reyes',
    role: 'C-UAS Instructor',
    flightCurrency: 'current',
    medicalCurrency: 'due',
    currentTask: 'Defeat matrix review — Shahed variants',
    href: '/defeat',
  },
  {
    id: 'op-3',
    initials: 'AK',
    name: 'A. Kowalski',
    role: 'WOPR Controller',
    flightCurrency: 'due',
    medicalCurrency: 'current',
    currentTask: 'Red/Blue Arena — tick advance',
    href: '/arena',
  },
  {
    id: 'op-4',
    initials: 'SL',
    name: 'S. Laurent',
    role: 'Spectrum Analyst',
    flightCurrency: 'current',
    medicalCurrency: 'current',
    currentTask: 'Band tile laydown — 2.4 GHz cluster',
    href: '/spectrum',
  },
]

export const DEMO_ASSETS: TrackedAsset[] = [
  {
    id: 'asset-shahed',
    designation: 'Shahed-136 (Geran-2)',
    serialNumber: 'RED-UAS-014',
    status: 'in-flight',
    batteryHealthPct: 78,
    batteryCycles: 12,
    payloadProfile: 'OWA warhead · INS/GPS',
    payloadActive: true,
    operator: 'J. Chen',
    jsaStatus: 'approved',
    platformHref: '/platforms/shahed-136',
  },
  {
    id: 'asset-lids',
    designation: 'LIDS',
    serialNumber: 'BLU-EFF-003',
    status: 'idle',
    batteryHealthPct: 94,
    batteryCycles: 4,
    payloadProfile: 'Ku-band effector · EO cue',
    payloadActive: false,
    operator: 'M. Reyes',
    jsaStatus: 'approved',
    platformHref: '/platforms/lids',
  },
  {
    id: 'asset-mavic',
    designation: 'DJI Matrice 300 RTK',
    serialNumber: 'BLU-ISR-007',
    status: 'pre-flight',
    batteryHealthPct: 88,
    batteryCycles: 31,
    payloadProfile: 'Thermal · LiDAR ISR payload',
    payloadActive: true,
    operator: 'S. Laurent',
    jsaStatus: 'pending',
    platformHref: '/platforms/matrice-300',
  },
]

export const DEFAULT_SELECTED_ASSET = DEMO_ASSETS[0]

export const DEMO_MAP_CONTEXT: LiveMapContext = {
  tracks: [
    { lon: 37.62, lat: 48.52, label: 'Shahed track' },
    { lon: 37.58, lat: 48.48 },
    { lon: 37.55, lat: 48.45 },
  ],
  geofenceCount: 2,
  inFlight: 1,
  preFlight: 1,
  idle: 2,
}

export function metricsWithCurrencyCount(pendingCurrency: number): DashboardMetrics {
  return {
    ...DEMO_METRICS,
    pendingApprovals: DEMO_METRICS.pendingApprovals + pendingCurrency,
    criticalAlerts:
      pendingCurrency > 0 ? Math.max(DEMO_METRICS.criticalAlerts, 1) : DEMO_METRICS.criticalAlerts,
  }
}
