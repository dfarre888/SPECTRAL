/**
 * Platform range envelope — adapted from A3DM lib/signals/c2-range-declaration.ts
 *
 * A3DM CASA/TMI uses 80% of declared C2 range as the operational containment cap.
 * SPECTRAL Map Intel draws a **horizontal combat envelope disc** at the stated altitude.
 *
 * OSINT `range_km` in the platform library is often manufacturer **ferry / one-way
 * max distance** (e.g. TB-001 @ 6000 km). Map Intel must NOT use that literally as
 * sphere radius — Earth is ~6371 km. We derive **operational combat radius** instead.
 */

import { effectiveRangeKm } from '@/lib/map/wind'
import type { AltitudeReference, MapUasAsset, WindSample } from '@/lib/map/types'
import type { PlatformCategory } from '@/lib/types'

/** CASA / TMI reference — operational cap vs declared max (A3DM pattern). */
export const CASA_RANGE_CONTAINMENT_RATIO = 0.8

/** SPECTRAL intel — envelope uses full derived operational radius (not 80% cap). */
export const SPECTRAL_SPEC_RANGE_RATIO = 1.0

/** Categories where max range is one-way — full spec is the envelope. */
const ONE_WAY_CATEGORIES = new Set<PlatformCategory>(['loitering_munition'])

export interface OperationalEnvelope {
  /** Raw OSINT max range from platform record (km). */
  declaredSpecKm: number
  /** Derived combat / operational radius for map disc (km). */
  operationalRadiusKm: number
  /** Human-readable basis for instructor briefs. */
  basis: 'spec' | 'one_way' | 'ferry_combat'
}

export interface PlatformRangeEnvelope {
  /** Raw OSINT max range (km) — may be ferry figure. */
  declaredRangeKm: number
  /** Combat envelope used for map disc (km). */
  operationalRadiusKm: number
  /** Optional 80% compliance reference (km) — A3DM TMI style. */
  containmentRangeKm: number
  /** Active range for map disc (km) — wind-adjusted operational radius. */
  effectiveRangeKm: number
  /** Radius used for Cesium disc (m). */
  sphereRadiusM: number
  /** Disc altitude MSL — envelope operating height. */
  discAltitudeM: number
  /** Legacy midpoint MSL — overlap reference. */
  sphereCentreAltM: number
  /** Whether effectiveRangeKm is below operational due to wind. */
  windAdjusted: boolean
  envelopeBasis: OperationalEnvelope['basis']
}

export function distanceValToKm(
  val: string,
  unit: 'm' | 'km' | 'nm' | 'ft',
): number | null {
  let km = parseFloat(val)
  if (!Number.isFinite(km) || km <= 0) return null
  if (unit === 'm') km /= 1000
  else if (unit === 'nm') km *= 1.852
  else if (unit === 'ft') km *= 0.0003048
  return km
}

/**
 * MSL altitude for the horizontal combat envelope disc.
 * AGL: terrain at launch + stated altitude. AMSL: absolute ceiling value.
 */
export function envelopeDiscAltitudeM(
  terrainAMSL: number,
  altitude_m: number,
  reference: AltitudeReference = 'AGL',
): number {
  return reference === 'AGL' ? terrainAMSL + altitude_m : altitude_m
}

export function containmentRangeKm(
  declaredKm: number,
  ratio = CASA_RANGE_CONTAINMENT_RATIO,
): number {
  return Math.round(declaredKm * ratio * 1000) / 1000
}

/**
 * Derive map combat radius from OSINT spec + endurance.
 * Ferry figures (>~2000 km) are reduced using out-and-back and fuel-limited caps.
 */
export function operationalEnvelopeRadiusKm(asset: MapUasAsset): OperationalEnvelope {
  const declaredSpecKm = Math.max(0.1, asset.max_range_km)

  if (ONE_WAY_CATEGORIES.has(asset.category)) {
    return {
      declaredSpecKm,
      operationalRadiusKm: declaredSpecKm,
      basis: 'one_way',
    }
  }

  // Short-range tactical — spec is already combat radius (Group 1–3, FPV, interceptors).
  if (declaredSpecKm <= 400) {
    return {
      declaredSpecKm,
      operationalRadiusKm: declaredSpecKm,
      basis: 'spec',
    }
  }

  const enduranceTotalKm =
    asset.max_speed_kmh > 0 && asset.endurance_min > 0
      ? asset.max_speed_kmh * (asset.endurance_min / 60)
      : declaredSpecKm

  // Outbound leg with fuel reserve for return (~45% of endurance distance).
  const enduranceCombatKm = enduranceTotalKm * 0.45
  const halfFerryKm = declaredSpecKm / 2

  const candidates = [declaredSpecKm, enduranceCombatKm, halfFerryKm]
  if (declaredSpecKm > 2000) {
    // Very long ferry claims (TB-001 6000 km) — combat radius ~25% of ferry (OSINT assessed).
    candidates.push(declaredSpecKm / 4)
  }

  const operationalRadiusKm = Math.max(
    0.1,
    Math.min(...candidates),
  )

  return {
    declaredSpecKm,
    operationalRadiusKm,
    basis: 'ferry_combat',
  }
}

/**
 * Combat range envelope — horizontal disc radius + altitude.
 * Map Intel draws EllipseGraphics at discAltitudeM in cesium-sync.
 */
export function computePlatformRangeEnvelope(
  asset: MapUasAsset,
  terrainAMSL: number,
  opts?: {
    wind?: WindSample | null
    flightBearingDeg?: number
    /** When true, use live wind to shrink sphere radius (headwind). */
    applyWind?: boolean
  },
): PlatformRangeEnvelope {
  const op = operationalEnvelopeRadiusKm(asset)
  const declaredRangeKm = op.declaredSpecKm
  const operationalRadiusKm = op.operationalRadiusKm
  const containmentRangeKmVal = containmentRangeKm(operationalRadiusKm)

  let effectiveKm = operationalRadiusKm
  let windAdjusted = false

  if (opts?.applyWind && opts.wind) {
    effectiveKm = effectiveRangeKm(
      { ...asset, max_range_km: operationalRadiusKm },
      opts.wind,
      opts.flightBearingDeg ?? 0,
    )
    windAdjusted = effectiveKm < operationalRadiusKm - 0.01
  }

  const sphereRadiusM = Math.max(100, effectiveKm * 1000)
  const discAltitudeM = envelopeDiscAltitudeM(
    terrainAMSL,
    asset.max_altitude_agl_m,
    asset.altitude_reference,
  )
  const sphereCentreAltM = terrainAMSL + asset.max_altitude_agl_m / 2

  return {
    declaredRangeKm,
    operationalRadiusKm,
    containmentRangeKm: containmentRangeKmVal,
    effectiveRangeKm: effectiveKm,
    sphereRadiusM,
    discAltitudeM,
    sphereCentreAltM,
    windAdjusted,
    envelopeBasis: op.basis,
  }
}
