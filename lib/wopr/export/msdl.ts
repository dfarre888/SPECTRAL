/**
 * MSDL (SISO-STD-007-2008, Military Scenario Definition Language) export of a
 * WOPR scenario's initial laydown.
 *
 * MSDL is the scenario initialisation standard for HLA (IEEE 1516, STANAG
 * 4603) and DIS federations: each federate loads the same force sides, units,
 * equipment and positions before time starts. This writes that file. It does
 * not connect to a federation; SPECTRAL has no HLA RTI or DIS gateway.
 *
 * Mapping (documented in the file header too):
 * - Each force becomes a ForceSide (Blue and Red, mutually hostile).
 * - Each force gets a headquarters Unit; each distinct `platform.unit` becomes
 *   a subordinate Unit (ORGANIC to that headquarters).
 * - Each platform becomes an EquipmentItem held by its unit.
 * - Installations (air bases, FOBs) become Installation elements on an overlay.
 * - Symbol identifiers are generic MIL-STD-2525B codes chosen by role (drone,
 *   ground equipment, ground unit, installation). Check them against the
 *   receiving federation's symbology tables.
 */

import { stableUuid } from '@/lib/wopr/export/ids'
import { el, xmlDocument, type XmlElement } from '@/lib/wopr/export/xml'
import { platformRole } from '@/lib/wopr/roles'
import type { WoprInstallation, WoprPlatform, WorldState, WoprScenario } from '@/lib/wopr/types'

export const MSDL_NAMESPACE = 'urn:sisostds:scenario:military:data:draft:msdl:1'
export const MODEL_ID_NAMESPACE = 'http://www.sisostds.org/schemas/modelID'
export const MSDL_VERSION = 'MSDL Standard Nov 2008'

/** Generic MIL-STD-2525B symbol identifiers (15 characters, restricted fields dashed). */
export const SYMBOL = {
  /** Air, military, fixed wing, drone (RPV/UAV). */
  drone: 'S-A-MFQ--------',
  /** Ground equipment, unspecified. */
  groundEquipment: 'S-G-E----------',
  /** Ground unit, unspecified (used for headquarters and teams). */
  groundUnit: 'S-G-U----------',
  /** Ground installation, unspecified. */
  installation: 'S-G-I----------',
} as const

/** Pattern the MSDL schema applies to unit and equipment symbol identifiers. */
export const FORCE_SYMBOL_RE = /^S-[PAGMOSTUFVXLIZ-]-[A-Z-]{6}[A-Z*-][A-Z*-]--[AECGNSX*-]$/
/** Pattern the MSDL schema applies to installation symbol identifiers. */
export const INSTALLATION_SYMBOL_RE = /^S-G[AP-]I[A-Z-]{5}[A-Z*-][A-Z*-]--[AECGNSX*-]$/

export interface MsdlOptions {
  exportedAt?: Date
  /** Required by ScenarioID/poc. No personal data is added unless passed here. */
  pocEmail?: string
  pocOrg?: string
}

type Side = 'blue' | 'red'
const SIDE_NAME: Record<Side, string> = { blue: 'Blue', red: 'Red' }

function round(n: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

/** MSDL text21: unique designations are at most 21 characters. */
function designation(text: string): string {
  const t = text.trim()
  return t.length <= 21 ? t : `${t.slice(0, 20)}~`
}

function gdc(lat: number, lon: number, elevationAglM?: number): XmlElement[] {
  return [
    el('CoordinateChoice', 'GDC'),
    el('CoordinateData', [
      el('GDC', [
        el('Latitude', round(lat, 6)),
        el('Longitude', round(lon, 6)),
        elevationAglM === undefined ? null : el('ElevationAGL', round(elevationAglM, 2)),
      ]),
    ]),
  ]
}

/** YYYY-MM-DDTHH:MM:SSZ (msdl:patternTimeDTG20). */
export function msdlDateTime(iso: string | undefined, fallback: Date): string {
  const d = iso ? new Date(iso) : fallback
  const t = Number.isNaN(d.getTime()) ? fallback : d
  return t.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function securityClassification(marking: string): string {
  return /^\s*UNCLASSIFIED/i.test(marking) ? 'Unclassified' : marking.split('//')[0].trim() || 'Unclassified'
}

function releaseRestriction(marking: string): string | null {
  const parts = marking.split('//').map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts.slice(1).join(' // ') : null
}

function areaOfInterest(world: WorldState): { north: number; south: number; east: number; west: number } | null {
  const pts: Array<{ lat: number; lon: number }> = [
    ...world.red_orbat.platforms,
    ...world.blue_orbat.platforms,
    ...(world.installations ?? []),
    ...[...world.red_orbat.platforms, ...world.blue_orbat.platforms].flatMap((p) => p.route ?? []),
  ]
  if (pts.length === 0) return null
  const pad = 0.05 // ~5 km margin
  return {
    north: Math.min(90, Math.max(...pts.map((p) => p.lat)) + pad),
    south: Math.max(-90, Math.min(...pts.map((p) => p.lat)) - pad),
    east: Math.min(180, Math.max(...pts.map((p) => p.lon)) + pad),
    west: Math.max(-180, Math.min(...pts.map((p) => p.lon)) - pad),
  }
}

function equipmentSymbol(p: WoprPlatform): string {
  return platformRole(p) === 'uas' ? SYMBOL.drone : SYMBOL.groundEquipment
}

interface UnitNode {
  key: string
  name: string
  side: Side
  handle: string
  isHq: boolean
  platforms: WoprPlatform[]
}

function buildUnits(scenarioId: string, side: Side, platforms: WoprPlatform[]): UnitNode[] {
  const hq: UnitNode = {
    key: `${side}:hq`,
    name: `${SIDE_NAME[side]} force HQ`,
    side,
    handle: stableUuid(`${scenarioId}:unit:${side}:hq`),
    isHq: true,
    platforms: [],
  }
  const byUnit = new Map<string, UnitNode>()
  for (const p of platforms) {
    const label = p.unit?.trim()
    if (!label) {
      hq.platforms.push(p)
      continue
    }
    let node = byUnit.get(label)
    if (!node) {
      node = {
        key: `${side}:${label}`,
        name: label,
        side,
        handle: stableUuid(`${scenarioId}:unit:${side}:${label}`),
        isHq: false,
        platforms: [],
      }
      byUnit.set(label, node)
    }
    node.platforms.push(p)
  }
  return [hq, ...byUnit.values()]
}

function centroid(ps: Array<{ lat: number; lon: number }>): { lat: number; lon: number } | null {
  if (ps.length === 0) return null
  return {
    lat: ps.reduce((s, p) => s + p.lat, 0) / ps.length,
    lon: ps.reduce((s, p) => s + p.lon, 0) / ps.length,
  }
}

function unitElement(u: UnitNode, hqHandle: string, forceHandle: string, allUnits: UnitNode[]): XmlElement {
  // A headquarters sits at the centroid of everything in its force.
  const located = u.isHq
    ? centroid(allUnits.filter((x) => x.side === u.side).flatMap((x) => x.platforms))
    : centroid(u.platforms)
  return el('Unit', [
    el('ObjectHandle', u.handle),
    el('SymbolIdentifier', SYMBOL.groundUnit),
    el('Name', u.name),
    el('UnitSymbolModifiers', [el('UniqueDesignation', designation(u.name))]),
    located ? el('Disposition', [el('Location', gdc(located.lat, located.lon))]) : null,
    el('Relations', [
      el(
        'ForceRelation',
        u.isHq
          ? [el('ForceRelationChoice', 'FORCE_SIDE'), el('ForceRelationData', [el('ForceSideHandle', forceHandle)])]
          : [
              el('ForceRelationChoice', 'UNIT'),
              el('ForceRelationData', [
                el('CommandRelation', [
                  el('CommandingSuperiorHandle', hqHandle),
                  el('CommandRelationshipType', 'ORGANIC'),
                ]),
              ]),
            ],
      ),
    ]),
    el('Model', [el('Resolution', 'HIGH'), el('AggregateBased', 'false')]),
  ])
}

function equipmentElement(scenarioId: string, p: WoprPlatform, owner: UnitNode): XmlElement {
  return el('EquipmentItem', [
    el('ObjectHandle', stableUuid(`${scenarioId}:equipment:${p.id}`)),
    el('SymbolIdentifier', equipmentSymbol(p)),
    el('Name', p.name),
    el('EquipmentSymbolModifiers', [
      el('Quantity', 1),
      el('UniqueDesignation', designation(p.name)),
      el('EquipmentType', p.platform_type),
    ]),
    el('Disposition', [el('Location', gdc(p.lat, p.lon, p.alt_m))]),
    el('Relations', [
      el('OrganicSuperiorHandle', owner.handle),
      el('HoldingOrganization', [
        el('OwnerChoice', 'UNIT'),
        el('OwnerData', [el('UnitOwnerHandle', owner.handle)]),
      ]),
    ]),
    el('Model', [el('Resolution', 'HIGH')]),
  ])
}

function installationElement(
  scenarioId: string,
  inst: WoprInstallation,
  forceHandle: string,
  overlayHandle: string,
): XmlElement {
  return el('Installation', [
    el('ObjectHandle', stableUuid(`${scenarioId}:installation:${inst.id}`)),
    el('SymbolIdentifier', SYMBOL.installation),
    el('Affiliation', inst.side === 'blue' ? 'FRIEND' : 'HOSTILE'),
    el('Owner', [
      el('OwnerChoice', 'FORCE_SIDE'),
      el('OwnerData', [el('ForceOwnerHandle', forceHandle)]),
    ]),
    el('Location', gdc(inst.lat, inst.lon, 0)),
    el('Orientation', 'ORIENT_RIGHT'),
    el('Name', inst.name),
    el('InstallationSymbolModifiers', [el('UniqueDesignation', designation(inst.name))]),
    el('AssociatedOverlays', [el('OverlayHandles', [el('OverlayHandle', overlayHandle)])]),
  ])
}

/** The laydown MSDL describes: the initial state when stored, else the current one. */
export function msdlWorld(scenario: WoprScenario): WorldState {
  return scenario.initial_world_state ?? scenario.world_state
}

export function scenarioToMsdl(scenario: WoprScenario, options: MsdlOptions = {}): string {
  const exportedAt = options.exportedAt ?? new Date()
  const world = msdlWorld(scenario)
  const sid = scenario.id

  const forceHandle: Record<Side, string> = {
    blue: stableUuid(`${sid}:force:blue`),
    red: stableUuid(`${sid}:force:red`),
  }

  const units: UnitNode[] = [
    ...buildUnits(sid, 'blue', world.blue_orbat.platforms),
    ...buildUnits(sid, 'red', world.red_orbat.platforms),
  ]
  const hqHandle: Record<Side, string> = {
    blue: units.find((u) => u.side === 'blue' && u.isHq)!.handle,
    red: units.find((u) => u.side === 'red' && u.isHq)!.handle,
  }

  const equipment = units.flatMap((u) => u.platforms.map((p) => equipmentElement(sid, p, u)))

  const installations = world.installations ?? []
  const overlaySides = (['blue', 'red'] as Side[]).filter((s) => installations.some((i) => i.side === s))
  const overlayHandle: Record<Side, string> = {
    blue: stableUuid(`${sid}:overlay:blue`),
    red: stableUuid(`${sid}:overlay:red`),
  }

  const aoi = areaOfInterest(world)
  const marking = scenario.classification || 'UNCLASSIFIED'
  const restriction = releaseRestriction(marking)
  const description =
    `SPECTRAL WOPR scenario laydown at T+0. ${world.blue_orbat.platforms.length} Blue and ` +
    `${world.red_orbat.platforms.length} Red platforms. OSINT training data; positions and ` +
    'timings are planning assumptions.'

  const forceSide = (side: Side): XmlElement => {
    const other: Side = side === 'blue' ? 'red' : 'blue'
    return el('ForceSide', [
      el('ObjectHandle', forceHandle[side]),
      el('ForceSideName', SIDE_NAME[side]),
      el('AllegianceHandle', forceHandle[side]),
      el('Associations', [
        el('Association', [el('AffiliateHandle', forceHandle[other]), el('Relationship', 'HO')]),
      ]),
    ])
  }

  const root = el(
    'MilitaryScenario',
    [
      el('ScenarioID', [
        el('modelID:name', scenario.name),
        el('modelID:type', 'Military Scenario'),
        el('modelID:version', String(Math.round(scenario.elapsed_min))),
        el('modelID:modificationDate', exportedAt.toISOString().slice(0, 10)),
        el('modelID:securityClassification', securityClassification(marking)),
        restriction ? el('modelID:releaseRestriction', restriction) : null,
        el('modelID:purpose', 'Training and analysis scenario initialisation'),
        el('modelID:applicationDomain', 'Training'),
        el('modelID:description', description),
        el('modelID:poc', [
          el('modelID:pocType', 'Primary author'),
          options.pocOrg ? el('modelID:pocOrg', options.pocOrg) : null,
          el('modelID:pocEmail', options.pocEmail ?? 'not.provided@example.invalid'),
        ]),
      ]),
      el('Options', [
        el('MSDLVersion', MSDL_VERSION),
        el('OrganizationDetail', [el('AggregateBased', 'false')]),
        el('ScenarioDataStandards', [
          el('SymbologyDataStandard', [
            el('StandardName', 'MILSTD_2525B'),
            el('MajorVersion', 'B'),
            el('MinorVersion', '0'),
          ]),
          el('CoordinateDataStandard', [
            el('CoordinateSystemType', 'GDC'),
            el('CoordinateSystemDatum', 'WGS84'),
          ]),
        ]),
      ]),
      el('Environment', [
        el('ScenarioTime', msdlDateTime(world.battlespace.start_time_utc, exportedAt)),
        aoi
          ? el('AreaOfInterest', [
              el('Name', world.battlespace.area ?? scenario.name),
              el('UpperRight', gdc(aoi.north, aoi.east, 0)),
              el('LowerLeft', gdc(aoi.south, aoi.west, 0)),
            ])
          : null,
      ]),
      el('ForceSides', [forceSide('blue'), forceSide('red')]),
      el('Organizations', [
        el(
          'Units',
          units.map((u) => unitElement(u, hqHandle[u.side], forceHandle[u.side], units)),
        ),
        equipment.length > 0 ? el('Equipment', equipment) : null,
      ]),
      overlaySides.length > 0
        ? el(
            'Overlays',
            overlaySides.map((s) =>
              el('Overlay', [
                el('ObjectHandle', overlayHandle[s]),
                el('OverlayType', 'OPERATIONS'),
                el('OverlayName', `${SIDE_NAME[s]} installations`),
              ]),
            ),
          )
        : null,
      installations.length > 0
        ? el(
            'Installations',
            installations.map((i) => installationElement(sid, i, forceHandle[i.side], overlayHandle[i.side])),
          )
        : null,
    ],
    { xmlns: MSDL_NAMESPACE, 'xmlns:modelID': MODEL_ID_NAMESPACE },
  )

  return xmlDocument(root, [
    marking,
    'Generated by SPECTRAL. MSDL (SISO-STD-007-2008) initialises HLA and DIS federations. SPECTRAL does not connect to a live HLA or DIS federation.',
    'Symbol identifiers are generic MIL-STD-2525B codes by role; check against your federation symbology tables.',
  ])
}
