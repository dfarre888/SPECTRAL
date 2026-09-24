// SPECTRAL: drone link bands and jammer coverage for the fratricide check
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
//
// Every band carries its source so the panel can say which figures are catalogue
// data and which are planning assumptions. Nothing here invents a platform spec:
// when the catalogue has no link data we fall back to the labelled FPV default
// (900 MHz control, 5.8 GHz video, 2.4 GHz data), and when a jammer has no
// band table we fall back to the app's existing C-UAS jammer template.

import { CAPABILITIES } from '@/data/seed-capabilities'
import { PLATFORMS } from '@/data/seed-platforms'
import { PLATFORM_ID_ALIASES } from '@/data/osint-platform-enrichment'
import { JAMMER_DB } from '@/lib/risk/ew-radius'
import { resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import type { MapCuasAsset, MapUasAsset, UasLinkPlan } from '@/lib/map/types'
import type { SpectrumCapability } from '@/lib/spectrum/types'

export type BandSource = 'curated' | 'catalogue' | 'estimated' | 'template' | 'assumed' | 'override'

export type LinkKind = 'c2' | 'video' | 'datalink'

export interface DroneLinkBand {
  kind: LinkKind
  label: string
  lo_mhz: number
  hi_mhz: number
  source: BandSource
}

export interface DroneLinkProfile {
  fibre: boolean
  links: DroneLinkBand[]
  /** Where the bulk of the link data came from. */
  source: BandSource
  note: string
}

export interface JamBand {
  label: string
  lo_mhz: number
  hi_mhz: number
  /** 'jam' = J/S against the link; 'hpm' = electronics effect inside the footprint regardless of band. */
  mode: 'jam' | 'hpm'
  source: BandSource
}

export interface JammerProfile {
  /** Radiates in drone link bands (RF jammer or HPM). */
  emits: boolean
  /** Detect-only sensor (RfPatrol, DroneBuster in detect mode). No fratricide risk. */
  passive: boolean
  bands: JamBand[]
  erp_dbm: number
  erp_source: 'osint-db' | 'catalogue' | 'curated' | 'template' | 'assumed'
  note: string
}

/** Common FPV / small UAS link bands, used for the default and for band-shift mitigations. */
export const COMMON_LINK_BANDS: Array<{ id: string; label: string; lo_mhz: number; hi_mhz: number; kinds: LinkKind[] }> = [
  { id: '433', label: '433 MHz', lo_mhz: 433.05, hi_mhz: 434.79, kinds: ['c2'] },
  { id: '900', label: '900 MHz', lo_mhz: 902, hi_mhz: 928, kinds: ['c2', 'datalink'] },
  { id: '1300', label: '1.3 GHz', lo_mhz: 1240, hi_mhz: 1300, kinds: ['video'] },
  { id: '2400', label: '2.4 GHz', lo_mhz: 2400, hi_mhz: 2483.5, kinds: ['c2', 'video', 'datalink'] },
  { id: '5800', label: '5.8 GHz', lo_mhz: 5725, hi_mhz: 5875, kinds: ['video', 'datalink'] },
]

export const DEFAULT_FPV_LINKS: DroneLinkBand[] = [
  { kind: 'c2', label: 'Control 900 MHz (assumed FPV default)', lo_mhz: 902, hi_mhz: 928, source: 'assumed' },
  { kind: 'video', label: 'Video 5.8 GHz (assumed FPV default)', lo_mhz: 5725, hi_mhz: 5875, source: 'assumed' },
  { kind: 'datalink', label: 'Data 2.4 GHz (assumed FPV default)', lo_mhz: 2400, hi_mhz: 2483.5, source: 'assumed' },
]

/** App C-UAS jammer template (data/capability-templates capsRfJammer), in MHz. */
const TEMPLATE_JAM_BANDS: JamBand[] = [
  { label: 'Jam 2.4 GHz (app jammer template)', lo_mhz: 2400, hi_mhz: 2483.5, mode: 'jam', source: 'template' },
  { label: 'Jam 5.8 GHz (app jammer template)', lo_mhz: 5725, hi_mhz: 5875, mode: 'jam', source: 'template' },
  { label: 'GNSS denial (app jammer template)', lo_mhz: 1160, hi_mhz: 1610, mode: 'jam', source: 'template' },
]

/** Template ERP: data/capability-templates capsRfJammer assesses 40 dBm for a man-portable jammer. */
export const DEFAULT_JAMMER_ERP_DBM = 40

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function mhzFromHz(hz: number | null | undefined): number | null {
  return typeof hz === 'number' && Number.isFinite(hz) ? hz / 1e6 : null
}

/** Band for a point frequency given in MHz (snaps to the common ISM band when it sits inside one). */
function bandForPoint(mhz: number): { lo: number; hi: number; label: string } {
  for (const b of COMMON_LINK_BANDS) {
    if (mhz >= b.lo_mhz - 1 && mhz <= b.hi_mhz + 1) return { lo: b.lo_mhz, hi: b.hi_mhz, label: b.label }
  }
  if (mhz >= 860 && mhz <= 870) return { lo: 863, hi: 870, label: '868 MHz' }
  return { lo: mhz, hi: mhz, label: mhz >= 1000 ? `${(mhz / 1000).toFixed(2)} GHz` : `${Math.round(mhz)} MHz` }
}

/** Parse a free-text link description ('2.4 / 5.8 GHz ISM', '900 MHz', 'fibre-optic'). */
export function parseLinkText(text: string | null | undefined): { fibre: boolean; mhz: number[] } {
  if (!text) return { fibre: false, mhz: [] }
  const t = text.toLowerCase()
  if (/fib(re|er)/.test(t)) return { fibre: true, mhz: [] }
  const out: number[] = []
  const re = /(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))*\s*(ghz|mhz)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    const unit = m[3]
    const nums = m[0].replace(/\s*(ghz|mhz)$/, '').split('/').map((x) => Number(x.trim()))
    for (const n of nums) {
      if (!Number.isFinite(n)) continue
      out.push(unit === 'ghz' ? n * 1000 : n)
    }
  }
  return { fibre: false, mhz: [...new Set(out)] }
}

function linksFromCaps(caps: SpectrumCapability[], source: BandSource): DroneLinkBand[] {
  const out: DroneLinkBand[] = []
  for (const c of caps) {
    if (c.axis !== 'rf') continue
    const kind: LinkKind | null =
      c.fn === 'control' ? 'c2' : c.fn === 'video' ? 'video' : c.fn === 'datalink' || c.fn === 'telemetry' ? 'datalink' : null
    if (!kind) continue
    const lo = mhzFromHz(c.freq_low_hz)
    const hi = mhzFromHz(c.freq_high_hz) ?? lo
    if (lo == null || hi == null) continue
    out.push({ kind, label: c.label, lo_mhz: lo, hi_mhz: Math.max(lo, hi), source })
  }
  return out
}

function linksFromCatalogue(asset: MapUasAsset): DroneLinkBand[] {
  const out: DroneLinkBand[] = []
  const push = (kind: LinkKind, list: number[] | null | undefined, what: string) => {
    for (const mhz of list ?? []) {
      const b = bandForPoint(mhz)
      out.push({ kind, label: `${what} ${b.label} (platform library)`, lo_mhz: b.lo, hi_mhz: b.hi, source: 'catalogue' })
    }
  }
  push('c2', asset.c2_mhz, 'Control')
  push('video', asset.video_mhz, 'Downlink')
  push('datalink', asset.datalink_mhz, 'Data')
  if (out.length > 0) return out

  const parsed = parseLinkText(asset.control_link_freq)
  if (parsed.mhz.length === 0) return out
  // Convention used across the app (capsFpv): the lower ISM band carries control, 5.8 GHz carries video.
  const sorted = [...parsed.mhz].sort((a, b) => a - b)
  sorted.forEach((mhz, i) => {
    const b = bandForPoint(mhz)
    const kind: LinkKind = sorted.length > 1 && i === sorted.length - 1 && mhz >= 5000 ? 'video' : i === 0 ? 'c2' : 'datalink'
    out.push({ kind, label: `${kind === 'c2' ? 'Control' : kind === 'video' ? 'Video' : 'Data'} ${b.label} (platform library)`, lo_mhz: b.lo, hi_mhz: b.hi, source: 'catalogue' })
  })
  return out
}

/** Resolve a drone's RF links. Order: curated spectrum dossier, platform library, estimated family, assumed FPV default. */
export function resolveDroneLinks(asset: MapUasAsset, plan?: UasLinkPlan): DroneLinkProfile {
  if (plan?.fibre) {
    return { fibre: true, links: [], source: 'override', note: 'Fibre-optic FPV set for this sortie. No RF link to jam.' }
  }

  const spectrum = resolveSpectrumUas(asset.id)
  const caps = spectrum?.capabilities ?? []
  const estimated = spectrum?.confidence === 'estimated'
  const rfSilent = caps.some((c) => c.defeat_resistance?.includes('rf_silent'))
  const textFibre = parseLinkText(asset.control_link_freq ?? spectrum?.control_link_freq).fibre

  let links: DroneLinkBand[] = []
  let source: BandSource = 'assumed'
  let note = ''

  const curatedLinks = !estimated ? linksFromCaps(caps, 'curated') : []
  if (curatedLinks.length > 0) {
    links = curatedLinks
    source = 'curated'
    note = 'Link bands from the spectrum dossier.'
  } else if ((textFibre || rfSilent) && linksFromCaps(caps, 'curated').length === 0) {
    return { fibre: true, links: [], source: 'curated', note: 'Fibre-optic or RF-silent in the platform data. No RF link to jam.' }
  } else {
    const cat = linksFromCatalogue(asset)
    if (cat.length > 0) {
      links = cat
      source = 'catalogue'
      note = 'Link bands from the platform library.'
    } else {
      const est = linksFromCaps(caps, 'estimated')
      if (est.length > 0) {
        links = est
        source = 'estimated'
        note = 'Estimated family link bands (no per-airframe signature in the catalogue).'
      } else {
        links = DEFAULT_FPV_LINKS.map((l) => ({ ...l }))
        source = 'assumed'
        note = 'No link data in the catalogue. Assumed FPV default: 900 MHz control, 5.8 GHz video, 2.4 GHz data.'
      }
    }
  }

  for (const o of plan?.overrides ?? []) {
    links = links.filter((l) => l.kind !== o.kind)
    links.push({ kind: o.kind, label: o.label, lo_mhz: o.lo_mhz, hi_mhz: o.hi_mhz, source: 'override' })
  }

  return { fibre: false, links, source, note }
}

/* ------------------------------ jammers ------------------------------ */

const JAM_FNS = new Set(['jam_control', 'jam_video', 'jam_gnss', 'jam_datalink', 'spoof_gnss'])
const DETECT_FNS = new Set(['detect_rf', 'detect_radar', 'detect_eo_ir', 'detect_cbrn'])

function seedIdsFor(asset: MapCuasAsset): string[] {
  const ids = new Set<string>([asset.id, PLATFORM_ID_ALIASES[asset.id] ?? asset.id])
  const n = norm(asset.name)
  for (const p of PLATFORMS) {
    if (p.side !== 'blue' && p.side !== 'red') continue
    const pn = norm(p.name)
    if (pn.length < 6 || n.length < 6) continue
    if (pn === n || n.includes(pn) || pn.includes(n)) ids.add(p.id)
  }
  return [...ids]
}

function capsForCuas(asset: MapCuasAsset): SpectrumCapability[] {
  const ids = new Set(seedIdsFor(asset))
  return CAPABILITIES.filter((c) => ids.has(c.platform_id))
}

function isJamKey(label: string): boolean {
  const k = label.toLowerCase()
  if (/detect|radar|surveil|engagement|fire_control|tracking|discriminator|primary|secondary|tertiary|seeker/.test(k)) return false
  return true
}

function erpFor(asset: MapCuasAsset, jamCaps: SpectrumCapability[], rfJammer: boolean): Pick<JammerProfile, 'erp_dbm' | 'erp_source'> {
  const n = norm(asset.name)
  const db = JAMMER_DB.find((j) => j.jammer_id === asset.id || norm(j.jammer_name) === n)
  if (db?.erp_watts) return { erp_dbm: 10 * Math.log10(db.erp_watts * 1000), erp_source: 'osint-db' }
  if (rfJammer && asset.power_output_w && asset.power_output_w > 0 && asset.power_output_w < 10_000) {
    return { erp_dbm: 10 * Math.log10(asset.power_output_w * 1000), erp_source: 'catalogue' }
  }
  const capPower = jamCaps.map((c) => c.power_dbm).filter((p): p is number => typeof p === 'number')
  if (capPower.length > 0) return { erp_dbm: Math.max(...capPower), erp_source: 'curated' }
  return { erp_dbm: DEFAULT_JAMMER_ERP_DBM, erp_source: 'assumed' }
}

/** Resolve what a placed C-UAS radiates into drone link bands. */
export function resolveJammerProfile(asset: MapCuasAsset): JammerProfile {
  const methods = (asset.defeat_methods ?? []).map((m) => m.toLowerCase())
  const rfJammer = methods.includes('rf_jamming') || methods.includes('ai_ew_adaptive')
  const hpm = methods.includes('microwave') || methods.includes('hpm') || methods.includes('emp')
  const caps = capsForCuas(asset)
  const jamCaps = caps.filter((c) => JAM_FNS.has(c.fn))
  const hpmCaps = caps.filter((c) => c.fn === 'hpm')
  const detectCaps = caps.filter((c) => DETECT_FNS.has(c.fn))

  const bands: JamBand[] = []
  let note = ''

  for (const c of jamCaps) {
    const lo = mhzFromHz(c.freq_low_hz)
    const hi = mhzFromHz(c.freq_high_hz) ?? lo
    if (lo == null || hi == null) continue
    bands.push({ label: c.label, lo_mhz: lo, hi_mhz: Math.max(lo, hi), mode: 'jam', source: 'curated' })
  }
  for (const c of hpmCaps) {
    const lo = mhzFromHz(c.freq_low_hz) ?? 300
    const hi = mhzFromHz(c.freq_high_hz) ?? 18_000
    bands.push({ label: c.label, lo_mhz: lo, hi_mhz: hi, mode: 'hpm', source: 'curated' })
  }
  if (bands.length > 0) note = 'Jam bands from the spectrum dossier.'

  if (bands.length === 0 && (rfJammer || asset.planningAssumption) && asset.bands_mhz?.length) {
    for (const b of asset.bands_mhz) {
      if (!isJamKey(b.label)) continue
      bands.push({
        label: b.label.replace(/_/g, ' '),
        lo_mhz: b.lo_mhz,
        hi_mhz: b.hi_mhz,
        mode: 'jam',
        source: asset.planningAssumption ? 'assumed' : 'catalogue',
      })
    }
    if (bands.length > 0) {
      note = asset.planningAssumption
        ? asset.note ?? 'Planning assumption. Edit to match the fielded system.'
        : 'Jam bands from the C-UAS catalogue.'
    }
  }

  if (bands.length === 0 && rfJammer) {
    bands.push(...TEMPLATE_JAM_BANDS.map((b) => ({ ...b })))
    note = 'No band table in the catalogue. Using the app C-UAS jammer template (2.4 GHz, 5.8 GHz, GNSS).'
  }

  if (bands.length === 0 && hpm) {
    bands.push({ label: 'HPM electronics effect (assumed wideband)', lo_mhz: 300, hi_mhz: 18_000, mode: 'hpm', source: 'assumed' })
    note = 'High-power microwave: treated as an electronics effect on any drone inside the footprint.'
  }

  const effectMethods = methods.filter((m) => m !== 'detect')
  const passive = bands.length === 0 && effectMethods.length === 0 && (methods.includes('detect') || detectCaps.length > 0)

  const erp = erpFor(asset, jamCaps, rfJammer)
  return {
    emits: bands.length > 0,
    passive,
    bands,
    ...erp,
    note: note || (passive ? 'Passive sensor. Does not radiate, no fratricide risk.' : 'Kinetic or optical effector. No RF emission in drone link bands.'),
  }
}
