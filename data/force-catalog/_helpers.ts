/**
 * Force Catalogue — shared builders. Keep nation files lean and consistent.
 * OSINT-descriptive only. Performance pins to SOVEREIGN_CORE_BOUNDARY.
 */

import type {
  CommsBearer,
  ForceCatalogPlatformFull,
  ForceSideCatalog,
  PlatformSensor,
} from '@/lib/bmi/bmi-types'

// ── Descriptive comms bearers (published interoperability standards) ────────────
export const link16 = (id: string, gateway = false): CommsBearer => ({
  id: `${id}-L16`, platform_id: id, kind: 'datalink', standard: 'link16', band: 'L',
  label: 'Link 16 (TADIL-J)', gateway_capable: gateway,
  comsec_note: 'Requires common crypto keying', pnt_dependent: true,
  data_confidence: 'high', sources: ['Published NATO datalink interoperability standards'],
  boundary_note: null,
})
export const link11 = (id: string): CommsBearer => ({
  id: `${id}-L11`, platform_id: id, kind: 'datalink', standard: 'link11', band: 'UHF',
  label: 'Link 11 (TADIL-A)', gateway_capable: false,
  comsec_note: 'Requires common crypto keying', pnt_dependent: false,
  data_confidence: 'high', sources: ['Published naval datalink standards'], boundary_note: null,
})
export const madl = (id: string): CommsBearer => ({
  id: `${id}-MADL`, platform_id: id, kind: 'datalink', standard: 'madl', band: 'Ku',
  label: 'MADL (F-35 LPI datalink)', gateway_capable: false,
  comsec_note: 'Stealth-optimised, F-35 flight only', pnt_dependent: true,
  data_confidence: 'high', sources: ['OSINT — F-35 MADL descriptive'], boundary_note: null,
})
export const ifdl = (id: string): CommsBearer => ({
  id: `${id}-IFDL`, platform_id: id, kind: 'datalink', standard: 'ifdl', band: 'Ku',
  label: 'IFDL (F-22 intra-flight datalink)', gateway_capable: false,
  comsec_note: 'F-22 flight only', pnt_dependent: true,
  data_confidence: 'high', sources: ['OSINT — F-22 IFDL descriptive'], boundary_note: null,
})
/**
 * Indigenous / national tactical datalink (non-NATO). Used by Red forces — will
 * NOT share a bearer with Link 16, correctly surfacing interop gaps against Blue.
 * pnt_dependent reflects reliance on national GNSS (e.g. BeiDou) for net timing.
 */
export const nationalDatalink = (
  id: string, label: string, band: CommsBearer['band'] = 'UHF', pnt = true,
): CommsBearer => ({
  id: `${id}-NDL`, platform_id: id, kind: 'datalink', standard: 'national', band,
  label, gateway_capable: false, comsec_note: 'National crypto — not coalition-interoperable',
  pnt_dependent: pnt, data_confidence: 'estimated',
  sources: ['OSINT — indigenous datalink (descriptive)'], boundary_note: null,
})
export const uhfVoice = (id: string): CommsBearer => ({
  id: `${id}-UHF`, platform_id: id, kind: 'voice_uhf', standard: null, band: 'UHF',
  label: 'UHF/VHF AM voice', gateway_capable: false, comsec_note: null, pnt_dependent: false,
  data_confidence: 'high', sources: ['Standard military air-band voice'], boundary_note: null,
})
export const hfVoice = (id: string): CommsBearer => ({
  id: `${id}-HF`, platform_id: id, kind: 'voice_hf', standard: null, band: 'HF',
  label: 'HF long-range voice', gateway_capable: false, comsec_note: null, pnt_dependent: false,
  data_confidence: 'high', sources: ['Standard military HF'], boundary_note: null,
})
export const satcom = (id: string): CommsBearer => ({
  id: `${id}-SAT`, platform_id: id, kind: 'voice_satcom', standard: null, band: 'Ku',
  label: 'SATCOM voice/data', gateway_capable: false, comsec_note: 'Encrypted SATCOM',
  pnt_dependent: false, data_confidence: 'medium', sources: ['OSINT platform fit'], boundary_note: null,
})

// ── Performance-pinned sensor stub (range/ECCM resolve in defence IDE) ──────────
export const pinnedSensor = (
  id: string, kind: PlatformSensor['kind'], label: string, band: string | null,
  role: string, canDetect: string[], cannotDetect: string[], note: string,
): PlatformSensor => ({
  id: `${id}-${kind}`, platform_id: id, kind, label, band, antenna: null, role,
  can_detect: canDetect, cannot_detect: cannotDetect,
  strengths: note, limitations: null, confidence: 'derived', intel_note: note,
  sources: ['OSINT descriptive'], performance_ref: 'SOVEREIGN_CORE_BOUNDARY', radar_catalog_id: null,
})

// ── Nation platform factory ────────────────────────────────────────────────────
export type CatalogEntry = Omit<
  ForceCatalogPlatformFull, 'is_catalog' | 'nation_code' | 'nation_name'
>

/** Returns a `P()` that stamps every entry with this nation's identity. */
export function nationFactory(code: string, name: string) {
  return (e: CatalogEntry): ForceCatalogPlatformFull => ({
    ...e, is_catalog: true, nation_code: code, nation_name: name,
  })
}

export type { ForceSideCatalog }
