/**
 * Single source of truth for Spectral's routable modules.
 *
 * Both the sidebar (components/layout/Sidebar.tsx) and the dashboard module
 * catalog (components/dashboard/DashboardModuleCatalog.tsx) derive from this
 * list. Adding a route without registering it here fails
 * lib/navigation/_test_module-registry.test.ts, which is what stops the three
 * lists from drifting apart again.
 *
 * Data only — no React, no lucide imports — so it stays testable under node.
 */

export type ModuleGroupId = 'intelligence' | 'planning' | 'training' | 'administration'

export type ModuleIconName =
  | 'activity'
  | 'clipboard-list'
  | 'coins'
  | 'crosshair'
  | 'database'
  | 'file-up'
  | 'flag'
  | 'gauge'
  | 'git-compare'
  | 'globe'
  | 'layers'
  | 'map'
  | 'radio'
  | 'satellite'
  | 'shield'
  | 'shopping-cart'
  | 'swords'
  | 'target'
  | 'trending-up'

export type ModuleAccent = 'accent' | 'cyan' | 'red' | 'amber' | 'success'

/** Keys on ModuleCatalogStats that can back a live tile count. */
export type ModuleCountKey =
  | 'platformCount'
  | 'defeatSystemCount'
  | 'gnssJammerCount'
  | 'conflictCaseCount'
  | 'plannerVignetteCount'

export interface SpectralModule {
  id: string
  href: string
  /** Sidebar label. */
  label: string
  /** Sidebar second line. */
  sub: string
  /** Catalog card eyebrow. */
  kicker: string
  /** Catalog card description. */
  blurb: string
  icon: ModuleIconName
  accent: ModuleAccent
  group: ModuleGroupId
  /** Catalog ordering — roughly threat priority. */
  priority: number
  /** Live count key, else staticCount is used. */
  countKey?: ModuleCountKey
  staticCount?: string
  countUnit: string
  /** Omit from the dashboard catalog (still reachable from the sidebar). */
  hideFromCatalog?: boolean
  /** Gated to the operations edition. */
  edition?: 'operations'
}

export interface ModuleGroup {
  id: ModuleGroupId
  label: string
  /** Short description used as the group's sidebar caption. */
  caption: string
}

export const MODULE_GROUPS: readonly ModuleGroup[] = [
  { id: 'intelligence', label: 'Intelligence', caption: 'Reference catalogues' },
  { id: 'planning', label: 'Planning', caption: 'Analysis & mission work' },
  { id: 'training', label: 'Training', caption: 'Exercises & wargaming' },
  { id: 'administration', label: 'Administration', caption: 'Data & review' },
] as const

export const SPECTRAL_MODULES: readonly SpectralModule[] = [
  // ---- Intelligence -------------------------------------------------------
  {
    id: 'defeat',
    href: '/defeat',
    label: 'Defeat Matrix',
    sub: 'Countermeasures',
    kicker: 'C-UAS',
    blurb: 'Platform × countermeasure effectiveness grid',
    icon: 'shield',
    accent: 'success',
    group: 'intelligence',
    priority: 1,
    countKey: 'defeatSystemCount',
    countUnit: 'systems',
  },
  {
    id: 'gnss',
    href: '/gnss',
    label: 'GNSS Intelligence',
    sub: 'Constellations & jammers',
    kicker: 'NAVWAR',
    blurb: 'Constellations, denial systems, defeat methods',
    icon: 'satellite',
    accent: 'cyan',
    group: 'intelligence',
    priority: 2,
    countKey: 'gnssJammerCount',
    countUnit: 'jammers',
  },
  {
    id: 'platforms',
    href: '/platforms',
    label: 'Platform Library',
    sub: 'platforms',
    kicker: 'UAS',
    blurb: 'World military UAS database with OSINT dossiers',
    icon: 'database',
    accent: 'accent',
    group: 'intelligence',
    priority: 3,
    countKey: 'platformCount',
    countUnit: 'platforms',
  },
  {
    id: 'spectrum',
    href: '/spectrum',
    label: 'Spectrum View',
    sub: 'SPECTRA / EW intel',
    kicker: 'EW',
    blurb: 'RF spectrum visualiser and SPECTRA kill-chain',
    icon: 'radio',
    accent: 'cyan',
    group: 'intelligence',
    priority: 4,
    staticCount: '6',
    countUnit: 'GHz span',
  },
  {
    id: 'conflicts',
    href: '/conflicts',
    label: 'Conflict Intel',
    sub: 'Curated case studies',
    kicker: 'CASE STUDY',
    blurb: 'Named engagements and operational lessons',
    icon: 'globe',
    accent: 'accent',
    group: 'intelligence',
    priority: 5,
    countKey: 'conflictCaseCount',
    countUnit: 'studies',
  },
  {
    id: 'conflict',
    href: '/conflict',
    label: 'Incident Timeline',
    sub: 'Live incident feed',
    kicker: 'LIVE FEED',
    blurb: 'Reported UAS incidents on a running timeline',
    icon: 'activity',
    accent: 'amber',
    group: 'intelligence',
    priority: 6,
    staticCount: 'Live',
    countUnit: 'feed',
  },
  {
    id: 'force',
    href: '/force',
    label: 'Force / ORBAT',
    sub: 'Air land sea nations',
    kicker: 'FORCE',
    blurb: 'Country air/land/sea catalogue, head-to-head, theatre work-up',
    icon: 'flag',
    accent: 'accent',
    group: 'intelligence',
    priority: 7,
    staticCount: '7',
    countUnit: 'nations',
  },
  {
    id: 'force-catalog',
    href: '/force-catalog',
    label: 'Force Catalogue',
    sub: 'Equipment reference',
    kicker: 'CATALOGUE',
    blurb: 'Full equipment catalogue behind the ORBAT rollups',
    icon: 'layers',
    accent: 'cyan',
    group: 'intelligence',
    priority: 8,
    staticCount: 'Ref',
    countUnit: 'catalogue',
  },
  {
    id: 'compare',
    href: '/compare',
    label: 'Platform Compare',
    sub: 'Side-by-side dossiers',
    kicker: 'ANALYSIS',
    blurb: 'Library platform dossier side-by-side comparison',
    icon: 'git-compare',
    accent: 'amber',
    group: 'intelligence',
    priority: 9,
    staticCount: '2',
    countUnit: 'min pick',
  },

  // ---- Planning -----------------------------------------------------------
  {
    id: 'map',
    href: '/map',
    label: 'Map Intel',
    sub: 'Terrain & envelopes',
    kicker: 'COP',
    blurb: 'Cesium laydown, mission paths, and force evaluation',
    icon: 'map',
    accent: 'cyan',
    group: 'planning',
    priority: 10,
    staticCount: 'Live',
    countUnit: 'laydown',
  },
  {
    id: 'planner',
    href: '/planner',
    label: 'Battlespace Planner',
    sub: 'Plans & IADS stacks',
    kicker: 'PLANNER',
    blurb: 'Battlespace plans, IADS stacks, engagement economics',
    icon: 'clipboard-list',
    accent: 'accent',
    group: 'planning',
    priority: 11,
    countKey: 'plannerVignetteCount',
    countUnit: 'vignettes',
  },
  {
    id: 'overlay',
    href: '/overlay',
    label: 'SAM Engagement',
    sub: 'Pk envelope & salvo',
    kicker: 'SAM',
    blurb: 'SAM intercept geometry, range rings, and salvo Pk',
    icon: 'crosshair',
    accent: 'red',
    group: 'planning',
    priority: 13,
    staticCount: 'Pk',
    countUnit: 'envelope',
  },
  {
    id: 'economics',
    href: '/economics',
    label: 'Engagement Economics',
    sub: 'Cost exchange ratios',
    kicker: 'COST',
    blurb: 'Interceptor-versus-threat cost exchange analysis',
    icon: 'trending-up',
    accent: 'amber',
    group: 'planning',
    priority: 14,
    staticCount: 'CER',
    countUnit: 'analysis',
  },
  {
    id: 'acquire',
    href: '/acquire',
    label: 'Acquisition',
    sub: 'Capability shortfalls',
    kicker: 'ACQUIRE',
    blurb: 'Capability gap workbench and procurement shortlists',
    icon: 'shopping-cart',
    accent: 'success',
    group: 'planning',
    priority: 15,
    staticCount: 'Gap',
    countUnit: 'workbench',
  },

  // ---- Training -----------------------------------------------------------
  {
    id: 'pcm',
    href: '/pcm',
    label: 'PCM',
    sub: 'Persistent combat model',
    kicker: 'PCM',
    blurb: 'Learner-driven exercises, globe runs, and force design',
    icon: 'gauge',
    accent: 'accent',
    group: 'training',
    priority: 16,
    staticCount: 'Live',
    countUnit: 'exercises',
  },
  {
    id: 'arena',
    href: '/arena',
    label: 'Red/Blue Arena',
    sub: 'WOPR scenario engine',
    kicker: 'WARGAME',
    blurb: 'Scenario engine and exercise briefs',
    icon: 'swords',
    accent: 'red',
    group: 'training',
    priority: 17,
    staticCount: '20+',
    countUnit: 'injects',
  },
  {
    id: 'bmi',
    href: '/bmi',
    label: 'BMI Exercise',
    sub: 'Battle management',
    kicker: 'BMI',
    blurb: 'Battle management interface exercise workspace',
    icon: 'activity',
    accent: 'cyan',
    group: 'training',
    priority: 18,
    staticCount: 'Ex',
    countUnit: 'serial',
  },

  // ---- Administration -----------------------------------------------------
  {
    id: 'currency',
    href: '/currency',
    label: 'Currency Queue',
    sub: 'TTP review pipeline',
    kicker: 'DS TOOLS',
    blurb: 'Directing staff review queue for TTP currency updates',
    icon: 'coins',
    accent: 'amber',
    group: 'administration',
    priority: 19,
    staticCount: 'Queue',
    countUnit: 'review',
    hideFromCatalog: true,
  },
  {
    id: 'operations-import',
    href: '/operations/import',
    label: 'Data Import',
    sub: 'Tenant ingest',
    kicker: 'INGEST',
    blurb: 'Tenant data ingest and import job approval',
    icon: 'file-up',
    accent: 'accent',
    group: 'administration',
    priority: 20,
    staticCount: 'Jobs',
    countUnit: 'ingest',
    hideFromCatalog: true,
    edition: 'operations',
  },
] as const

/** Catalog card accent classes, keyed by the registry's semantic accent name. */
export const MODULE_ACCENT_CLASSES: Record<ModuleAccent, string> = {
  accent:
    'text-[var(--store-accent)] bg-[var(--store-accent-glow)] border-[var(--store-accent-border)]',
  cyan: 'text-cyan bg-cyan/10 border-cyan/25',
  red: 'text-red bg-red/10 border-red/25',
  amber: 'text-amber bg-amber/10 border-amber/25',
  success:
    'text-[var(--store-success)] bg-[rgba(74,222,128,0.10)] border-[rgba(74,222,128,0.20)]',
}

export interface SidebarGroup {
  group: ModuleGroup
  modules: SpectralModule[]
}

interface EditionContext {
  operationsEdition: boolean
}

function isVisible(module: SpectralModule, ctx: EditionContext): boolean {
  if (module.edition === 'operations') return ctx.operationsEdition
  return true
}

/** Sidebar navigation, grouped, with edition-gated modules filtered out. */
export function sidebarGroups(ctx: EditionContext): SidebarGroup[] {
  return MODULE_GROUPS.map((group) => ({
    group,
    modules: SPECTRAL_MODULES.filter(
      (m) => m.group === group.id && isVisible(m, ctx),
    ).sort((a, b) => a.priority - b.priority),
  })).filter((g) => g.modules.length > 0)
}

/** Dashboard catalog tiles, threat-priority order. */
export function catalogModules(ctx: EditionContext = { operationsEdition: false }): SpectralModule[] {
  return SPECTRAL_MODULES.filter((m) => !m.hideFromCatalog && isVisible(m, ctx)).sort(
    (a, b) => a.priority - b.priority,
  )
}

/**
 * Resolve the module owning a pathname, matching the longest href prefix so
 * that detail routes (/platforms/shahed-136) light up their parent.
 */
export function moduleByHref(pathname: string): SpectralModule | undefined {
  let best: SpectralModule | undefined
  for (const m of SPECTRAL_MODULES) {
    if (pathname === m.href || pathname.startsWith(`${m.href}/`)) {
      if (!best || m.href.length > best.href.length) best = m
    }
  }
  return best
}
