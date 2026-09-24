import { describe, expect, it } from 'vitest'
import { DEMO_SCENARIO_IDS, demoWoprScenarios } from '@/lib/wopr/demo-scenarios'
import { stableUuid, UUID_RE } from '@/lib/wopr/export/ids'
import {
  FORCE_SYMBOL_RE,
  INSTALLATION_SYMBOL_RE,
  MSDL_NAMESPACE,
  msdlDateTime,
  scenarioToMsdl,
} from '@/lib/wopr/export/msdl'
import { escapeXml } from '@/lib/wopr/export/xml'
import type { WoprScenario } from '@/lib/wopr/types'

// ── A strict, tiny XML reader: throws on anything not well-formed ───────────

interface Node {
  name: string
  attrs: Record<string, string>
  children: Node[]
  text: string
}

const NAME = '[A-Za-z_][A-Za-z0-9_.:-]*'

function decode(s: string): string {
  if (/&(?!(amp|lt|gt|quot|apos);)/.test(s)) throw new Error(`Bad entity in: ${s.slice(0, 40)}`)
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

function parseXml(xml: string): Node {
  let i = 0
  const s = xml
  const skipMisc = () => {
    for (;;) {
      const ws = /^\s*/.exec(s.slice(i))![0]
      i += ws.length
      if (s.startsWith('<?', i)) {
        const end = s.indexOf('?>', i)
        if (end < 0) throw new Error('Unclosed declaration')
        i = end + 2
      } else if (s.startsWith('<!--', i)) {
        const end = s.indexOf('-->', i)
        if (end < 0) throw new Error('Unclosed comment')
        if (s.slice(i + 4, end).includes('--')) throw new Error('"--" inside comment')
        i = end + 3
      } else return
    }
  }
  const parseElement = (): Node => {
    const open = new RegExp(`^<(${NAME})((?:\\s+${NAME}\\s*=\\s*"[^"<]*")*)\\s*(/?)>`).exec(s.slice(i))
    if (!open) throw new Error(`Expected element at ${i}: ${s.slice(i, i + 30)}`)
    i += open[0].length
    const attrs: Record<string, string> = {}
    for (const m of open[2].matchAll(new RegExp(`(${NAME})\\s*=\\s*"([^"<]*)"`, 'g'))) {
      if (m[1] in attrs) throw new Error(`Duplicate attribute ${m[1]}`)
      attrs[m[1]] = decode(m[2])
    }
    const node: Node = { name: open[1], attrs, children: [], text: '' }
    if (open[3] === '/') return node
    for (;;) {
      const lt = s.indexOf('<', i)
      if (lt < 0) throw new Error(`Unclosed <${node.name}>`)
      const text = s.slice(i, lt)
      if (text.includes('>')) throw new Error('Raw ">" in text is allowed but suspicious here')
      node.text += decode(text)
      i = lt
      if (s.startsWith('</', i)) {
        const close = new RegExp(`^</(${NAME})\\s*>`).exec(s.slice(i))
        if (!close || close[1] !== node.name) throw new Error(`Mismatched close for <${node.name}> at ${i}`)
        i += close[0].length
        node.text = node.text.trim()
        return node
      }
      if (s.startsWith('<!--', i)) {
        skipMisc()
        continue
      }
      node.children.push(parseElement())
    }
  }
  skipMisc()
  const root = parseElement()
  skipMisc()
  if (i !== s.length) throw new Error('Content after the root element')
  return root
}

const kids = (n: Node, name: string) => n.children.filter((c) => c.name === name)
const kid = (n: Node, name: string) => {
  const k = kids(n, name)
  if (k.length !== 1) throw new Error(`Expected one <${name}> in <${n.name}>, got ${k.length}`)
  return k[0]
}
const all = (n: Node, name: string): Node[] => [
  ...(n.name === name ? [n] : []),
  ...n.children.flatMap((c) => all(c, name)),
]

// ── Tests ───────────────────────────────────────────────────────────────────

const demo = (id: string) => demoWoprScenarios('t').find((s) => s.id === id)!
const EXPORTED = new Date('2026-09-24T03:00:00Z')

describe('scenarioToMsdl', () => {
  const scenario = demo(DEMO_SCENARIO_IDS.alMinhad)
  const xml = scenarioToMsdl(scenario, { exportedAt: EXPORTED })
  const root = parseXml(xml)

  it('is well-formed XML with a MilitaryScenario root in the MSDL namespace', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(root.name).toBe('MilitaryScenario')
    expect(root.attrs.xmlns).toBe(MSDL_NAMESPACE)
    expect(root.attrs['xmlns:modelID']).toBeDefined()
  })

  it('has the MSDL sections in schema order', () => {
    expect(root.children.map((c) => c.name)).toEqual([
      'ScenarioID',
      'Options',
      'Environment',
      'ForceSides',
      'Organizations',
      'Overlays',
      'Installations',
    ])
  })

  it('identifies the scenario with the modelID fields MSDL requires', () => {
    const id = kid(root, 'ScenarioID')
    const names = id.children.map((c) => c.name)
    for (const req of ['modelID:name', 'modelID:type', 'modelID:version', 'modelID:modificationDate', 'modelID:securityClassification', 'modelID:description', 'modelID:poc']) {
      expect(names).toContain(req)
    }
    expect(kid(id, 'modelID:name').text).toBe(scenario.name)
    expect(kid(id, 'modelID:modificationDate').text).toBe('2026-09-24')
    expect(kid(id, 'modelID:securityClassification').text).toBe('Unclassified')
    expect(kid(id, 'modelID:releaseRestriction').text).toBe('FOR OFFICIAL TRAINING USE ONLY')
    expect(kid(kid(id, 'modelID:poc'), 'modelID:pocEmail').text).toMatch(/\.invalid$/)
  })

  it('declares options and the scenario time', () => {
    const opts = kid(root, 'Options')
    expect(kid(opts, 'MSDLVersion').text).toBeTruthy()
    const coords = kid(kid(opts, 'ScenarioDataStandards'), 'CoordinateDataStandard')
    expect(kid(coords, 'CoordinateSystemType').text).toBe('GDC')
    expect(kid(coords, 'CoordinateSystemDatum').text).toBe('WGS84')
    const env = kid(root, 'Environment')
    expect(kid(env, 'ScenarioTime').text).toBe('2026-10-20T19:40:00Z')
    expect(kid(env, 'ScenarioTime').text).toHaveLength(20)
    expect(kids(env, 'AreaOfInterest')).toHaveLength(1)
  })

  it('has two mutually hostile force sides', () => {
    const sides = kids(kid(root, 'ForceSides'), 'ForceSide')
    expect(sides.map((s) => kid(s, 'ForceSideName').text)).toEqual(['Blue', 'Red'])
    const [blue, red] = sides
    const bh = kid(blue, 'ObjectHandle').text
    const rh = kid(red, 'ObjectHandle').text
    expect(kid(kid(kid(blue, 'Associations'), 'Association'), 'AffiliateHandle').text).toBe(rh)
    expect(kid(kid(kid(red, 'Associations'), 'Association'), 'Relationship').text).toBe('HO')
    expect(kid(blue, 'AllegianceHandle').text).toBe(bh)
  })

  it('lists units and one equipment item per platform, positioned, with valid references', () => {
    const orgs = kid(root, 'Organizations')
    const units = kids(kid(orgs, 'Units'), 'Unit')
    const equipment = kids(kid(orgs, 'Equipment'), 'EquipmentItem')
    const world = scenario.initial_world_state!
    expect(equipment).toHaveLength(world.blue_orbat.platforms.length + world.red_orbat.platforms.length)
    const unitHandles = new Set(units.map((u) => kid(u, 'ObjectHandle').text))
    const sideHandles = new Set(kids(kid(root, 'ForceSides'), 'ForceSide').map((s) => kid(s, 'ObjectHandle').text))
    for (const u of units) {
      expect(kid(u, 'SymbolIdentifier').text).toMatch(FORCE_SYMBOL_RE)
      expect(kid(kid(u, 'UnitSymbolModifiers'), 'UniqueDesignation').text.length).toBeLessThanOrEqual(21)
      const rel = kid(kid(u, 'Relations'), 'ForceRelation')
      const data = kid(rel, 'ForceRelationData')
      if (kid(rel, 'ForceRelationChoice').text === 'FORCE_SIDE') {
        expect(sideHandles.has(kid(data, 'ForceSideHandle').text)).toBe(true)
      } else {
        expect(unitHandles.has(kid(kid(data, 'CommandRelation'), 'CommandingSuperiorHandle').text)).toBe(true)
      }
      expect(kids(u, 'Model')).toHaveLength(1)
    }
    const shahed = world.red_orbat.platforms[0]
    const item = equipment.find((e) => kid(e, 'Name').text === shahed.name)!
    const g = kid(kid(kid(kid(item, 'Disposition'), 'Location'), 'CoordinateData'), 'GDC')
    expect(Number(kid(g, 'Latitude').text)).toBeCloseTo(shahed.lat, 5)
    expect(Number(kid(g, 'Longitude').text)).toBeCloseTo(shahed.lon, 5)
    expect(Number(kid(g, 'ElevationAGL').text)).toBe(shahed.alt_m)
    expect(kid(item, 'SymbolIdentifier').text).toBe('S-A-MFQ--------')
    for (const e of equipment) {
      expect(kid(e, 'SymbolIdentifier').text).toMatch(FORCE_SYMBOL_RE)
      const owner = kid(kid(kid(kid(e, 'Relations'), 'HoldingOrganization'), 'OwnerData'), 'UnitOwnerHandle').text
      expect(unitHandles.has(owner)).toBe(true)
    }
  })

  it('exports the air base as an Installation on an overlay', () => {
    const inst = kids(kid(root, 'Installations'), 'Installation')
    expect(inst).toHaveLength(1)
    expect(kid(inst[0], 'Name').text).toBe('Al Minhad Air Base')
    expect(kid(inst[0], 'Affiliation').text).toBe('FRIEND')
    expect(kid(inst[0], 'SymbolIdentifier').text).toMatch(INSTALLATION_SYMBOL_RE)
    const overlayHandles = new Set(kids(kid(root, 'Overlays'), 'Overlay').map((o) => kid(o, 'ObjectHandle').text))
    const ref = kid(kid(kid(inst[0], 'AssociatedOverlays'), 'OverlayHandles'), 'OverlayHandle').text
    expect(overlayHandles.has(ref)).toBe(true)
  })

  it('uses unique, well-formed, stable object handles', () => {
    const handles = all(root, 'ObjectHandle').map((n) => n.text)
    expect(new Set(handles).size).toBe(handles.length)
    for (const h of handles) expect(h).toMatch(UUID_RE)
    expect(scenarioToMsdl(scenario, { exportedAt: EXPORTED })).toBe(xml)
  })

  it('exports the initial laydown, not the advanced state', () => {
    const ts27 = demo(DEMO_SCENARIO_IDS.ts27)
    const recon = ts27.initial_world_state!.blue_orbat.platforms.find((p) => p.id === 'blue-recon-uas')!
    const moved = ts27.world_state.blue_orbat.platforms.find((p) => p.id === 'blue-recon-uas')!
    expect(moved.lat).not.toBeCloseTo(recon.lat, 3)
    const r = parseXml(scenarioToMsdl(ts27, { exportedAt: EXPORTED }))
    const item = all(r, 'EquipmentItem').find((e) => kid(e, 'Name').text === recon.name)!
    const g = all(item, 'GDC')[0]
    expect(Number(kid(g, 'Latitude').text)).toBeCloseTo(recon.lat, 5)
  })

  it('escapes hostile text and omits empty sections', () => {
    const s: WoprScenario = {
      ...demo(DEMO_SCENARIO_IDS.williamtown),
      name: 'R&D <trial> "A" \'B\'',
      initial_world_state: null,
    }
    s.world_state = structuredClone(s.world_state)
    s.world_state.installations = []
    s.world_state.red_orbat.platforms[0].name = 'Drone <1> & co'
    const out = scenarioToMsdl(s, { exportedAt: EXPORTED })
    const r = parseXml(out)
    expect(kid(kid(r, 'ScenarioID'), 'modelID:name').text).toBe('R&D <trial> "A" \'B\'')
    expect(all(r, 'Name').some((n) => n.text === 'Drone <1> & co')).toBe(true)
    expect(kids(r, 'Installations')).toHaveLength(0)
    expect(kids(r, 'Overlays')).toHaveLength(0)
  })

  it('states that there is no live HLA or DIS connection', () => {
    expect(xml).toMatch(/does not connect to a live HLA or DIS federation/)
  })
})

describe('helpers', () => {
  it('stableUuid is deterministic and UUID-shaped', () => {
    expect(stableUuid('a')).toBe(stableUuid('a'))
    expect(stableUuid('a')).not.toBe(stableUuid('b'))
    expect(stableUuid('x')).toMatch(UUID_RE)
  })

  it('msdlDateTime trims milliseconds and falls back on bad input', () => {
    expect(msdlDateTime('2027-08-12T20:00:00.000Z', EXPORTED)).toBe('2027-08-12T20:00:00Z')
    expect(msdlDateTime('not a date', EXPORTED)).toBe('2026-09-24T03:00:00Z')
    expect(msdlDateTime(undefined, EXPORTED)).toBe('2026-09-24T03:00:00Z')
  })

  it('escapeXml escapes markup and strips forbidden control characters', () => {
    expect(escapeXml('a<b>&"\'\u0001')).toBe('a&lt;b&gt;&amp;&quot;&apos;')
  })
})
