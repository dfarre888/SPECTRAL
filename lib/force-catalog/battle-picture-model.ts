/**
 * Callers: ForceCatalogBattlePicture.tsx, _test_battle-picture-model.test.ts
 * Purpose: Commander Battle Picture — presets, effect mapping, assessment bands
 * Spec: docs/force-catalog/PROMPT-BATTLE-PICTURE.md
 */

import type { Domain, ForceCatalogPlatformFull, ForceSideCatalog } from '@/lib/bmi/bmi-types'

export type AssessmentBand = 'OVERMATCH' | 'CONTESTED' | 'UNDERDOG' | 'THIN DATA'

export type EffectId =
  | 'isr_male'
  | 'owa_loiter'
  | 'usv_maritime'
  | 'land_precision'
  | 'air_superiority'
  | 'amd_bmd'
  | 'cuas_shorad'
  | 'gnss_denial'
  | 'aew_c2'
  | 'strategic_mobility'

export interface EffectDef {
  id: EffectId
  label: string
}

export const BATTLE_EFFECTS: EffectDef[] = [
  { id: 'isr_male', label: 'Persistent ISR / MALE-HALE' },
  { id: 'owa_loiter', label: 'OWA / loitering saturation' },
  { id: 'usv_maritime', label: 'Attritable USV / maritime drone strike' },
  { id: 'land_precision', label: 'Land precision strike / GLCM-SRBM class' },
  { id: 'air_superiority', label: 'Air superiority / multirole combat air' },
  { id: 'amd_bmd', label: 'AMD / BMD' },
  { id: 'cuas_shorad', label: 'C-UAS / SHORAD' },
  { id: 'gnss_denial', label: 'GNSS denial / PNT attack' },
  { id: 'aew_c2', label: 'AEW&C / battle management' },
  { id: 'strategic_mobility', label: 'Strategic mobility / tanker-airlift' },
]

export type ScenarioPresetId =
  | 'ukraine-2026'
  | 'red-sea-hvu'
  | 'pb26-blue'
  | 'sindoor'

export interface ScenarioPreset {
  id: ScenarioPresetId
  label: string
  nationCodes: string[]
  forceSides: ForceSideCatalog[]
  searchHints: string[]
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'ukraine-2026',
    label: 'Ukraine 2026',
    nationCodes: ['UKR', 'RUS', 'XCC', 'USA', 'DEU'],
    forceSides: [],
    searchHints: [],
  },
  {
    id: 'red-sea-hvu',
    label: 'Red Sea HVU',
    nationCodes: ['HOU', 'IRN', 'USA', 'ISR', 'XCC', 'XTH'],
    forceSides: [],
    searchHints: [],
  },
  {
    id: 'pb26-blue',
    label: "Pitch Black '26 Blue",
    nationCodes: [
      'AUS', 'USA', 'GBR', 'JPN', 'KOR', 'SGP', 'FRA', 'DEU', 'ESP', 'PHL', 'PNG', 'NZL', 'CAN',
    ],
    forceSides: ['blue', 'neutral'],
    searchHints: [],
  },
  {
    id: 'sindoor',
    label: 'IND–PAK Sindoor',
    nationCodes: ['IND', 'PAK'],
    forceSides: [],
    searchHints: ['sindoor', 'combat-proven'],
  },
]

export interface EffectRowAssessment {
  effect: EffectDef
  blueCount: number
  redCount: number
  band: AssessmentBand
  thinOsint: boolean
  blueIds: string[]
  redIds: string[]
}

export interface DomainStrip {
  domain: Domain | 'em'
  blue: number
  red: number
}

export interface BattlePictureView {
  presetId: ScenarioPresetId | null
  blueCount: number
  redCount: number
  neutralCount: number
  effects: EffectRowAssessment[]
  domains: DomainStrip[]
  assessText: string
}

const THIN_TOTAL = 2

function hay(p: ForceCatalogPlatformFull): string {
  return `${p.id} ${p.short_name} ${p.designation} ${p.open_source_summary} ${p.platform_library_id ?? ''} ${p.role}`.toLowerCase()
}

export function effectsForPlatform(p: ForceCatalogPlatformFull): EffectId[] {
  const h = hay(p)
  const out = new Set<EffectId>()

  if (
    p.role === 'isr' ||
    /heron|reaper|mq-9|male|hale|global.?hawk|wing.?loong|ch-4|ch-5|mavic|orlan|predator/.test(h)
  ) {
    out.add('isr_male')
  }

  if (
    /owa|shahed|geran|loiter|lancet|harop|harpy|switchblade|phoenix.?ghost|gerbera|qasef|samad|wa.?id|palyanytsya|sky.?striker/.test(h) ||
    (p.role === 'other' && p.domain === 'air' && /combat-proven:.*(owa|loiter|shahed|lancet)/.test(h))
  ) {
    out.add('owa_loiter')
  }

  if (
    /usv|magura|sea.?baby|barq|drone.?boat|attritable.?usv/.test(h) ||
    (p.domain === 'maritime' && p.role === 'other' && /drone|usv|unmanned/.test(h))
  ) {
    out.add('usv_maritime')
  }

  if (
    /iskander|kalibr|kh-101|atacms|gml|storm.?shadow|brahmos|babur|pralay|pinaka|gmlh|gml|nasr|himars|gml|cruise.?missile|ballistic|srbm|mrbm|glcm|quasi-ballistic|umpk|glide.?bomb/.test(h) ||
    (p.domain === 'ground' && p.role === 'other' && /missile|rocket|strike/.test(h))
  ) {
    out.add('land_precision')
  }

  if (p.role === 'fighter' || p.role === 'multirole' || p.role === 'trainer_lead_in') {
    out.add('air_superiority')
  }

  if (
    p.role === 'radar_ground' ||
    /patriot|thaad|nasams|iris-t|s-400|s-300|buk|pantsir|arrow|iron.?dome|david.?sling|skynex|gepard|aster|samp|barak|hq-9|cheongung|sm-3|sm-6|aegis.?bmd|c-dome|sky.?sabre/.test(h)
  ) {
    out.add('amd_bmd')
  }

  if (
    /c-uas|cuas|shorad|skynex|gepard|vampire|counter.?uas|giraf|iris-t.?sls/.test(h) ||
    (p.role === 'radar_ground' && /c-uas|shorad|point/.test(h))
  ) {
    out.add('cuas_shorad')
  }

  if (
    /gnss.?den|jamm|spoof|krasukha|pole-21|electronic.?warfare|pnt.?attack|xcc-cat-gnss/.test(h) ||
    p.role === 'ew'
  ) {
    out.add('gnss_denial')
  }

  if (p.role === 'aew_c' || /aew|awacs|erieye|phalcon|netra|e-2|e-3|e-7|globaleye|peace.?eye/.test(h)) {
    out.add('aew_c2')
  }

  if (p.role === 'tanker' || p.role === 'transport' || /tanker|airlift|c-17|c-130|a400|kc-|mrtt|globemaster/.test(h)) {
    out.add('strategic_mobility')
  }

  if (p.nation_code === 'XCC' || p.nation_code === 'XTH') {
    if (/fo-fpv|fpv|cots|mavic|starlink/.test(h)) out.add('owa_loiter')
    if (/usv/.test(h)) out.add('usv_maritime')
    if (/owa|saturation/.test(h)) out.add('owa_loiter')
    if (/umpk|interceptor.?econ/.test(h)) {
      out.add('land_precision')
      out.add('amd_bmd')
    }
    if (/c-uas|cuas/.test(h)) out.add('cuas_shorad')
    if (/gnss/.test(h)) out.add('gnss_denial')
    if (/asbm|harop|harpy|tb2|decoy/.test(h)) {
      out.add('owa_loiter')
      out.add('amd_bmd')
    }
  }

  return [...out]
}

export function assessBand(blueCount: number, redCount: number): AssessmentBand {
  const total = blueCount + redCount
  if (total < THIN_TOTAL) return 'THIN DATA'
  if (blueCount === 0 && redCount > 0) return 'UNDERDOG'
  if (redCount === 0 && blueCount > 0) return 'OVERMATCH'
  const ratio = blueCount / Math.max(redCount, 1)
  if (ratio >= 1.5) return 'OVERMATCH'
  if (ratio <= 1 / 1.5) return 'UNDERDOG'
  return 'CONTESTED'
}

export function applyScenarioPreset(
  platforms: ForceCatalogPlatformFull[],
  preset: ScenarioPreset,
): ForceCatalogPlatformFull[] {
  const nations = new Set(preset.nationCodes)
  const sides = new Set(preset.forceSides)
  return platforms.filter((p) => {
    if (!nations.has(p.nation_code)) return false
    if (sides.size && !sides.has(p.force_side)) return false
    return true
  })
}

function majorityEstimated(platforms: ForceCatalogPlatformFull[]): boolean {
  if (!platforms.length) return true
  const est = platforms.filter((p) => p.data_confidence === 'estimated').length
  return est > platforms.length / 2
}

export function buildBattlePictureView(
  platforms: ForceCatalogPlatformFull[],
  presetId: ScenarioPresetId | null,
): BattlePictureView {
  const blue = platforms.filter((p) => p.force_side === 'blue')
  const red = platforms.filter((p) => p.force_side === 'red')
  const neutral = platforms.filter((p) => p.force_side === 'neutral')

  const effects: EffectRowAssessment[] = BATTLE_EFFECTS.map((effect) => {
    const blueHits = blue.filter((p) => effectsForPlatform(p).includes(effect.id))
    const redHits = red.filter((p) => effectsForPlatform(p).includes(effect.id))
    const allHits = platforms.filter((p) => effectsForPlatform(p).includes(effect.id))
    const band = assessBand(blueHits.length, redHits.length)
    return {
      effect,
      blueCount: blueHits.length,
      redCount: redHits.length,
      band,
      thinOsint: majorityEstimated([...blueHits, ...redHits]) || allHits.length < THIN_TOTAL,
      blueIds: blueHits.map((p) => p.id),
      redIds: redHits.map((p) => p.id),
    }
  })

  const domainKeys: Array<Domain | 'em'> = ['air', 'ground', 'maritime', 'em']
  const domains: DomainStrip[] = domainKeys.map((d) => {
    if (d === 'em') {
      return {
        domain: 'em',
        blue: blue.filter((p) => p.role === 'ew' || effectsForPlatform(p).includes('gnss_denial')).length,
        red: red.filter((p) => p.role === 'ew' || effectsForPlatform(p).includes('gnss_denial')).length,
      }
    }
    return {
      domain: d,
      blue: blue.filter((p) => p.domain === d).length,
      red: red.filter((p) => p.domain === d).length,
    }
  })

  const over = effects.filter((e) => e.band === 'OVERMATCH').map((e) => e.effect.label)
  const cont = effects.filter((e) => e.band === 'CONTESTED').map((e) => e.effect.label)
  const under = effects.filter((e) => e.band === 'UNDERDOG').map((e) => e.effect.label)
  const presetLabel =
    presetId != null
      ? (SCENARIO_PRESETS.find((p) => p.id === presetId)?.label ?? presetId)
      : 'CUSTOM'

  const list = (xs: string[]) => (xs.length ? xs.join('; ') : 'none')

  const assessText = [
    `ASSESS — ${presetLabel}. Blue ${blue.length} / Red ${red.length} platforms in scope.`,
    `Overmatch: ${list(over)}. Contested: ${list(cont)}. Underdog: ${list(under)}.`,
    'So what: drill Compare on Underdog/Contested; confirm AMD magazine and OWA counters first.',
  ].join(' ')

  return {
    presetId,
    blueCount: blue.length,
    redCount: red.length,
    neutralCount: neutral.length,
    effects,
    domains,
    assessText,
  }
}

export function platformsForEffect(
  platforms: ForceCatalogPlatformFull[],
  effectId: EffectId,
): ForceCatalogPlatformFull[] {
  return platforms.filter((p) => effectsForPlatform(p).includes(effectId))
}

export function getPreset(id: ScenarioPresetId): ScenarioPreset {
  const p = SCENARIO_PRESETS.find((x) => x.id === id)
  if (!p) throw new Error(`Unknown preset ${id}`)
  return p
}
