/**
 * Base Protection coverage model.
 *
 * Pure functions, no I/O, safe in client and server code.
 *
 * What it does
 * - Credits each catalogue system with layers from its catalogue tags:
 *     detect, combined  -> Detect and Track (a sensor, or an integrated
 *                          system that carries its own sensors)
 *     any other tag     -> Defeat (RF jamming, kinetic, laser, net, HPM...)
 *   The catalogue does not yet separate detect-only sensors (for example
 *   passive RF) from tracking sensors, so a sensor row is credited with both.
 *   This is stated in the UI.
 * - Uses `effective_range_m` as the layer reach. A row without a positive
 *   range is shown as "range not published" and left out of the maths. No
 *   range is ever guessed.
 * - Places units by a fixed, stated rule: one unit sits at the site centre;
 *   two or more are spaced evenly on a ring at half the protection radius,
 *   the first due north. This is a planning layout, not a siting study.
 * - Coverage is the share of the protection circle's area inside at least
 *   one unit's reach for that layer. Exact when every unit is at the centre,
 *   otherwise sampled on a fixed grid (error under about 1 percentage point).
 * - Cost uses `price_usd_approx` only. Values under US$1,000 are treated as
 *   per-engagement figures rather than unit prices and are not used. A row
 *   without a usable price is "no public cost".
 *
 * Published ranges are maximums against each system's design target. Small
 * drones are harder to see and hit, so treat coverage as an upper bound.
 *
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

export type Layer = 'detect' | 'track' | 'defeat'
export const LAYERS: readonly Layer[] = ['detect', 'track', 'defeat'] as const
export const LAYER_LABEL: Record<Layer, string> = { detect: 'Detect', track: 'Track', defeat: 'Defeat' }

/** The catalogue fields this model reads. A subset of `anti_drone_systems`. */
export interface CatalogueSystem {
  id: string
  name: string
  manufacturer: string | null
  country: string | null
  defeat_method: string[] | null
  effective_range_m: number | null
  price_usd_approx: number | string | null
  portability: string | null
  data_confidence: string | null
  sources: string[] | null
}

export interface PackageItem {
  systemId: string
  qty: number
}

export interface SitePlan {
  siteId: string
  items: PackageItem[]
  /** User override of the nominal radius, metres. Null means use the site default. */
  radiusM: number | null
  updatedAt: string | null
}

export type SystemRole = 'sensor' | 'effector' | 'integrated'

const SENSOR_TAGS = new Set(['detect', 'combined'])
/** Below this a catalogue price is a per-shot figure, not a unit price. */
export const MIN_UNIT_PRICE_USD = 1_000
export const MAX_QTY = 12
/** Coverage at or above this counts as full (sampling tolerance). */
export const FULL_COVERAGE = 0.995

const ADVERSARY_ORIGIN = /\b(russia|china|iran|north korea|dprk)\b/i

export function normaliseTags(tags: readonly string[] | null | undefined): string[] {
  return (tags ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean)
}

export function layersForSystem(sys: Pick<CatalogueSystem, 'defeat_method'>): Layer[] {
  const tags = normaliseTags(sys.defeat_method)
  const out: Layer[] = []
  if (tags.some((t) => SENSOR_TAGS.has(t))) out.push('detect', 'track')
  if (tags.some((t) => t !== 'detect')) out.push('defeat')
  return out
}

export function systemRole(sys: Pick<CatalogueSystem, 'defeat_method'>): SystemRole | null {
  const l = layersForSystem(sys)
  const sensing = l.includes('detect')
  const defeat = l.includes('defeat')
  if (sensing && defeat) return 'integrated'
  if (sensing) return 'sensor'
  if (defeat) return 'effector'
  return null
}

/** Positive published range in metres, or null ("range not published"). */
export function publishedRangeM(sys: Pick<CatalogueSystem, 'effective_range_m'>): number | null {
  const r = Number(sys.effective_range_m)
  return Number.isFinite(r) && r > 0 ? r : null
}

export type PriceStatus = 'published' | 'no_public_cost' | 'per_engagement_only'

export function unitPriceUsd(sys: Pick<CatalogueSystem, 'price_usd_approx'>): { usd: number | null; status: PriceStatus } {
  if (sys.price_usd_approx == null || sys.price_usd_approx === '') return { usd: null, status: 'no_public_cost' }
  const p = Number(sys.price_usd_approx)
  if (!Number.isFinite(p) || p <= 0) return { usd: null, status: 'no_public_cost' }
  if (p < MIN_UNIT_PRICE_USD) return { usd: null, status: 'per_engagement_only' }
  return { usd: p, status: 'published' }
}

export function isAdversaryOrigin(country: string | null | undefined): boolean {
  return ADVERSARY_ORIGIN.test(country ?? '')
}

export function clampQty(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(MAX_QTY, Math.round(n)))
}

/** Merge duplicates, clamp quantities, drop blanks. Order of first appearance is kept. */
export function normaliseItems(items: readonly PackageItem[]): PackageItem[] {
  const map = new Map<string, number>()
  for (const it of items) {
    const id = String(it.systemId ?? '').trim()
    if (!id) continue
    map.set(id, (map.get(id) ?? 0) + (Number.isFinite(it.qty) ? it.qty : 1))
  }
  return [...map.entries()].map(([systemId, qty]) => ({ systemId, qty: clampQty(qty) }))
}

// ── Geometry ─────────────────────────────────────────────────────────────

export interface PlacedUnit {
  systemId: string
  name: string
  /** Metres east of site centre. */
  x: number
  /** Metres north of site centre. */
  y: number
  rangeM: number
  layers: Layer[]
  role: SystemRole
}

/** Unit positions for `qty` units of one system inside a site of radius `radiusM`. */
export function unitPositions(qty: number, radiusM: number): Array<{ x: number; y: number }> {
  const n = clampQty(qty)
  if (n === 1) return [{ x: 0, y: 0 }]
  const ring = radiusM / 2
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 // 0 = north, clockwise
    return { x: Math.sin(a) * ring, y: Math.cos(a) * ring }
  })
}

const GRID_N = 81

/** Sample points inside the unit disc (fixed grid, deterministic). */
function discSamples(): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (let i = 0; i < GRID_N; i++) {
    for (let j = 0; j < GRID_N; j++) {
      const x = ((i + 0.5) / GRID_N) * 2 - 1
      const y = ((j + 0.5) / GRID_N) * 2 - 1
      if (x * x + y * y <= 1) pts.push([x, y])
    }
  }
  return pts
}
let SAMPLES: Array<[number, number]> | null = null

/** Share of a disc of radius R (centred on the origin) inside the union of circles. */
export function discCoverage(radiusM: number, circles: ReadonlyArray<{ x: number; y: number; r: number }>): number {
  if (!(radiusM > 0) || circles.length === 0) return 0
  if (circles.every((c) => c.x === 0 && c.y === 0)) {
    const r = Math.max(...circles.map((c) => c.r))
    return Math.min(1, (r / radiusM) ** 2)
  }
  // Any circle that swallows the whole disc settles it.
  if (circles.some((c) => Math.hypot(c.x, c.y) + radiusM <= c.r)) return 1
  SAMPLES ??= discSamples()
  let hit = 0
  for (const [ux, uy] of SAMPLES) {
    const px = ux * radiusM
    const py = uy * radiusM
    for (const c of circles) {
      const dx = px - c.x
      const dy = py - c.y
      if (dx * dx + dy * dy <= c.r * c.r) {
        hit++
        break
      }
    }
  }
  return hit / SAMPLES.length
}

// ── Assessment ───────────────────────────────────────────────────────────

export interface AssessedItem {
  systemId: string
  qty: number
  system: CatalogueSystem | null
  name: string
  layers: Layer[]
  role: SystemRole | null
  rangeM: number | null
  rangeStatus: 'published' | 'not_published' | 'not_in_catalogue'
  unitPriceUsd: number | null
  priceStatus: PriceStatus | 'not_in_catalogue'
}

export interface LayerCoverage {
  layer: Layer
  /** 0..1 share of the protection circle's area. */
  fraction: number
  /** Longest published reach contributing to the layer, metres. */
  reachM: number | null
  systemIds: string[]
}

export type LayerState = 'full' | 'partial' | 'none'

export interface CostToClose {
  status: 'no_package' | 'published' | 'partial' | 'no_public_cost'
  totalUsd: number
  pricedUnits: number
  unpricedUnits: number
}

export interface SiteAssessment {
  siteId: string
  radiusM: number
  radiusIsDefault: boolean
  items: AssessedItem[]
  units: PlacedUnit[]
  layers: Record<Layer, LayerCoverage>
  /** Layers below full coverage, in detect, track, defeat order. */
  uncovered: Layer[]
  cost: CostToClose
  hasPackage: boolean
}

export function layerState(fraction: number): LayerState {
  if (fraction >= FULL_COVERAGE) return 'full'
  if (fraction > 0) return 'partial'
  return 'none'
}

export function assessSite(
  site: { id: string; nominalRadiusM: number },
  plan: Pick<SitePlan, 'items' | 'radiusM'> | null | undefined,
  catalogue: ReadonlyMap<string, CatalogueSystem>,
): SiteAssessment {
  const radiusM = plan?.radiusM && plan.radiusM > 0 ? plan.radiusM : site.nominalRadiusM
  const items = normaliseItems(plan?.items ?? [])

  const assessed: AssessedItem[] = items.map(({ systemId, qty }) => {
    const sys = catalogue.get(systemId) ?? null
    if (!sys) {
      return {
        systemId,
        qty,
        system: null,
        name: systemId,
        layers: [],
        role: null,
        rangeM: null,
        rangeStatus: 'not_in_catalogue',
        unitPriceUsd: null,
        priceStatus: 'not_in_catalogue',
      }
    }
    const rangeM = publishedRangeM(sys)
    const price = unitPriceUsd(sys)
    return {
      systemId,
      qty,
      system: sys,
      name: sys.name,
      layers: layersForSystem(sys),
      role: systemRole(sys),
      rangeM,
      rangeStatus: rangeM == null ? 'not_published' : 'published',
      unitPriceUsd: price.usd,
      priceStatus: price.status,
    }
  })

  const units: PlacedUnit[] = []
  for (const it of assessed) {
    if (it.rangeM == null || it.role == null) continue
    for (const p of unitPositions(it.qty, radiusM)) {
      units.push({ systemId: it.systemId, name: it.name, x: p.x, y: p.y, rangeM: it.rangeM, layers: it.layers, role: it.role })
    }
  }

  const layers = {} as Record<Layer, LayerCoverage>
  for (const layer of LAYERS) {
    const contributing = units.filter((u) => u.layers.includes(layer))
    layers[layer] = {
      layer,
      fraction: discCoverage(
        radiusM,
        contributing.map((u) => ({ x: u.x, y: u.y, r: u.rangeM })),
      ),
      reachM: contributing.length ? Math.max(...contributing.map((u) => u.rangeM)) : null,
      systemIds: [...new Set(contributing.map((u) => u.systemId))],
    }
  }

  const uncovered = LAYERS.filter((l) => layerState(layers[l].fraction) !== 'full')

  let totalUsd = 0
  let pricedUnits = 0
  let unpricedUnits = 0
  for (const it of assessed) {
    if (it.unitPriceUsd != null) {
      totalUsd += it.unitPriceUsd * it.qty
      pricedUnits += it.qty
    } else {
      unpricedUnits += it.qty
    }
  }
  const cost: CostToClose = {
    status:
      assessed.length === 0
        ? 'no_package'
        : unpricedUnits === 0
          ? 'published'
          : pricedUnits === 0
            ? 'no_public_cost'
            : 'partial',
    totalUsd,
    pricedUnits,
    unpricedUnits,
  }

  return {
    siteId: site.id,
    radiusM,
    radiusIsDefault: !(plan?.radiusM && plan.radiusM > 0),
    items: assessed,
    units,
    layers,
    uncovered,
    cost,
    hasPackage: assessed.length > 0,
  }
}

// ── Formatting helpers (shared by table and detail pane) ─────────────────

export function formatRangeM(m: number | null): string {
  if (m == null) return 'range not published'
  if (m >= 10_000) return `${Math.round(m / 1000).toLocaleString('en-AU')} km`
  if (m >= 1_000) return `${(m / 1000).toFixed(1)} km`
  return `${Math.round(m)} m`
}

export function formatUsdShort(usd: number): string {
  if (usd >= 1_000_000_000) return `US$${(usd / 1_000_000_000).toFixed(usd % 1_000_000_000 === 0 ? 0 : 1)}B`
  if (usd >= 1_000_000) return `US$${(usd / 1_000_000).toFixed(usd % 1_000_000 === 0 ? 0 : 1)}M`
  if (usd >= 1_000) return `US$${Math.round(usd / 1_000)}k`
  return `US$${Math.round(usd)}`
}

export function formatPct(fraction: number): string {
  if (fraction >= FULL_COVERAGE) return '100%'
  if (fraction > 0 && fraction < 0.01) return '<1%'
  return `${Math.round(fraction * 100)}%`
}

export function costLabel(cost: CostToClose): string {
  switch (cost.status) {
    case 'no_package':
      return 'No package'
    case 'no_public_cost':
      return 'No public cost'
    case 'published':
      return formatUsdShort(cost.totalUsd)
    case 'partial':
      return `${formatUsdShort(cost.totalUsd)} + ${cost.unpricedUnits} unpriced`
  }
}
