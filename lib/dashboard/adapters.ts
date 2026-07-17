/** Dashboard copy + skin — Spectral training/ops vs A3DM aviation management labels. */
export type DashboardSkin = 'spectral' | 'spectral-ops' | 'a3dm'

export interface DashboardCopy {
  commandEyebrow: string
  commandTitle: string
  commandSubtitle: string
  crewPanelTitle: string
  crewPanelSubtitle: string
  crewCurrencyHint: string
  mapPanelTitle: string
  mapPanelSubtitle: string
  assetPanelTitle: string
  batteryLabel: string
  payloadLabel: string
  operatorLabel: string
  jsaLabel: string
  metrics: {
    activeRpa: { label: string; sub: string }
    activeMissions: { label: string; sub: string }
    pendingApprovals: { label: string; sub: string }
    criticalAlerts: { label: string; sub: string }
  }
}

const SPECTRAL_TRAINING: DashboardCopy = {
  commandEyebrow: 'Master Command Center',
  commandTitle: 'Operational picture at a glance',
  commandSubtitle:
    'Block-based COP layout — threat laydown, airspace context, analyst currency, and selected platform intelligence.',
  crewPanelTitle: 'Crew & Compliance',
  crewPanelSubtitle: 'Analyst currency · mission assignment',
  crewCurrencyHint: 'Flight · Medical currency',
  mapPanelTitle: 'Live Airspace',
  mapPanelSubtitle: 'Geospatial tracker · Map Intel laydown',
  assetPanelTitle: 'Selected Asset',
  batteryLabel: 'Endurance index',
  payloadLabel: 'Payload profile',
  operatorLabel: 'Operator',
  jsaLabel: 'JSA',
  metrics: {
    activeRpa: { label: 'Active RPA', sub: 'On laydown / tracked' },
    activeMissions: { label: 'Airspace Missions', sub: 'WOPR · Map Intel' },
    pendingApprovals: { label: 'Pending Approvals', sub: 'Import · currency' },
    criticalAlerts: { label: 'Critical Alerts', sub: 'Defeat · data gaps' },
  },
}

const SPECTRAL_OPS: DashboardCopy = {
  ...SPECTRAL_TRAINING,
  commandEyebrow: 'Operations Command Center',
  commandSubtitle:
    'Tenant-scoped COP — live plans, WOPR scenarios, import queue, and adjudicated laydown from Map Intel.',
  crewPanelSubtitle: 'Operator currency · tenant missions',
  metrics: {
    ...SPECTRAL_TRAINING.metrics,
    pendingApprovals: { label: 'Pending Approvals', sub: 'Import jobs · DS review' },
  },
}

const A3DM: DashboardCopy = {
  commandEyebrow: 'Fleet Command Center',
  commandTitle: 'All fleet data in one place',
  commandSubtitle:
    'Advance Aviation and Drone Management — active flights, CASA approvals, maintenance status, and crew dispatch.',
  crewPanelTitle: 'Pilot Log & Dispatch',
  crewPanelSubtitle: 'Flight currency · medical · mission assignment',
  crewCurrencyHint: 'Flight · Medical certification',
  mapPanelTitle: 'Live RPAS Tracker',
  mapPanelSubtitle: 'Flight paths · geofences · airspace buffers',
  assetPanelTitle: 'Aircraft Intelligence',
  batteryLabel: 'Battery health',
  payloadLabel: 'Attached payload',
  operatorLabel: 'Pilot in command',
  jsaLabel: 'Job Safety Analysis',
  metrics: {
    activeRpa: { label: 'Active RPA', sub: 'In-flight · pre-flight' },
    activeMissions: { label: 'Active Missions', sub: 'Airspace operations' },
    pendingApprovals: { label: 'CASA Approvals', sub: 'Pending flight authorisation' },
    criticalAlerts: { label: 'Maintenance Defects', sub: 'Grounded · critical' },
  },
}

export function getDashboardCopy(skin: DashboardSkin): DashboardCopy {
  if (skin === 'a3dm') return A3DM
  if (skin === 'spectral-ops') return SPECTRAL_OPS
  return SPECTRAL_TRAINING
}

/** Server: NEXT_PUBLIC_PRODUCT_SKIN=a3dm | edition-based default. */
export function getDashboardSkin(): DashboardSkin {
  if (process.env.NEXT_PUBLIC_PRODUCT_SKIN === 'a3dm') return 'a3dm'
  const edition = process.env.SPECTRAL_EDITION ?? process.env.NEXT_PUBLIC_SPECTRAL_EDITION
  return edition === 'operations' ? 'spectral-ops' : 'spectral'
}

/** Client-safe skin detection. */
export function getDashboardSkinClient(): DashboardSkin {
  if (process.env.NEXT_PUBLIC_PRODUCT_SKIN === 'a3dm') return 'a3dm'
  if (process.env.NEXT_PUBLIC_SPECTRAL_EDITION === 'operations') return 'spectral-ops'
  return 'spectral'
}

export function getDefaultHomeTab(skin: DashboardSkin): 'command' | 'modules' {
  return skin === 'spectral' ? 'modules' : 'command'
}
