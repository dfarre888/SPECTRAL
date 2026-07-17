/** Operational status — Haulix-style scan badges adapted for Spectral COP */
export type OperationalStatus =
  | 'in-flight'
  | 'pre-flight'
  | 'idle'
  | 'grounded'
  | 'pending'
  | 'alert'

export type CurrencyDot = 'current' | 'due' | 'expired'

export interface DashboardMetrics {
  activeRpa: number
  activeMissions: number
  pendingApprovals: number
  criticalAlerts: number
}

export interface OperatorRow {
  id: string
  initials: string
  name: string
  role: string
  flightCurrency: CurrencyDot
  medicalCurrency: CurrencyDot
  currentTask: string
  href?: string
}

export interface TrackedAsset {
  id: string
  designation: string
  serialNumber: string
  status: OperationalStatus
  batteryHealthPct: number
  batteryCycles: number
  payloadProfile: string
  payloadActive: boolean
  operator: string
  jsaStatus: 'approved' | 'pending' | 'required'
  platformHref?: string
}

export interface MapTrackPoint {
  lon: number
  lat: number
  label?: string
}

export interface LiveMapContext {
  tracks: MapTrackPoint[]
  geofenceCount: number
  inFlight: number
  preFlight: number
  idle: number
}
