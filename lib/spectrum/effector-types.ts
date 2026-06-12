/**
 * Spectrum Intelligence — F3 effector / interceptor layer types
 * =============================================================
 * Extends the model from "what emits/detects/jams" (radars) to the full
 * Find–Fix–Finish kill chain. An EffectorSystem is a shooter: a SAM, a gun,
 * an HPM, or a laser. It carries:
 *   - FIND/FIX: the sensor that cues it (links to a RadarSystem id)
 *   - FIRE:     the engagement envelope (min/max range, min/max altitude,
 *               no-escape zone) — this is what becomes a polygon on the map
 *   - FINISH:   effect type, Pk, magazine depth, reload/cooldown
 *   - SURVIVABILITY: what it can evade, ARM/SEAD vulnerability, EMCON posture
 *
 * STATIC NOW, DYNAMIC LATER: every field needed for a time-stepped engagement
 * sim is present (flyout speed, reaction time, reload). The sim seam is marked
 * `// DYNAMIC-SIM`. The static layer ignores time; the geometry + intersection
 * helpers below answer "what can engage what, and where are the gaps".
 */

import type { Side } from './types';
import type { TargetClass } from './radar-types';

/** How the target is actually defeated. */
export type EffectType =
  | 'kinetic_missile'   // hit-to-kill or blast-frag SAM
  | 'kinetic_gun'       // AAA / CIWS
  | 'hpm'               // high-power microwave (area, counter-electronics)
  | 'laser'             // directed-energy, single-target dwell
  | 'kinetic_interceptor_drone' // drone-on-drone / loitering interceptor
  | 'net_capture';      // physical capture (point defence)

/** Tier of the layered IADS — drives map ring colour & planning. */
export type EffectorTier =
  | 'point_defence'     // <10 km, last-ditch
  | 'shorad'            // short-range air defence
  | 'medium'            // medium-range SAM
  | 'long'              // long-range SAM
  | 'strategic_bmd'     // exo/endo ballistic missile defence
  | 'ciws_naval'        // naval close-in
  | 'c_uas';            // dedicated counter-UAS effector

/** The FIRE dimension — becomes the 3D engagement volume on the map. */
export interface EngagementEnvelope {
  min_range_km: number;
  max_range_km: number;
  min_alt_km: number;       // floor (can it hit "off the deck"?)
  max_alt_km: number;       // ceiling
  /** no-escape zone: inside this range an evading target likely cannot outrun the shot */
  no_escape_range_km?: number | null;
  /** coverage arc — 360 for rotating, else sector degrees */
  azimuth_deg?: number | null;
  /** DYNAMIC-SIM: flyout speed (Mach) for time-to-intercept maths */
  intercept_speed_mach?: number | null;
}

export interface EffectorSystem {
  id: string;
  name: string;
  nato_name?: string | null;
  side: Side;
  origin: string;
  manufacturer?: string | null;
  tier: EffectorTier;
  associated_system?: string | null;   // parent platform (e.g. "S-400")
  /** FIND/FIX — radar ids that cue this effector (links into the radar layer) */
  cueing_radar_ids?: string[];

  effect: EffectType;
  envelope: EngagementEnvelope;

  /** FINISH */
  pk_estimate?: number | null;          // 0..1 single-shot kill probability (open-source)
  magazine?: number | null;             // ready rounds before reload (∞ for DE = null + note)
  magazine_note?: string | null;        // e.g. "effectively unlimited (power-limited)"
  reload_min?: number | null;           // DYNAMIC-SIM: reload/cooldown time
  cost_per_shot_usd?: number | null;    // engagement economics (drone vs interceptor)

  /** what this effector can / cannot kill */
  defeats: TargetClass[];
  cannot_defeat: TargetClass[];

  /** SURVIVABILITY */
  mobility: 'fixed' | 'relocatable' | 'mobile' | 'self_propelled' | 'naval' | 'airborne';
  arm_sead_vulnerability?: 'low' | 'medium' | 'high' | null; // emits → targetable
  emcon?: 'always_emitting' | 'emits_when_engaging' | 'passive_capable' | null;
  can_evade?: string[];                 // what an offensive platform can dodge (for Red strike UAS)

  limitations?: string[];
  strengths?: string[];
  confidence: 'curated' | 'derived' | 'estimated';
  intel_note?: string | null;
}

/* ============================ engagement geometry ============================ */
/**
 * Static geometry the planner needs. These produce the data the CesiumJS Map
 * Intel renders as range rings / domes; SPECTRA computes, Cesium draws.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

/** A placed effector on the map → its engagement volume. */
export interface PlacedEffector {
  effectorId: string;
  origin: GeoPoint;
  /** heading for sector systems (deg true); ignored for 360° */
  heading_deg?: number;
}

/** Ring geometry for Cesium (a circle or sector annulus at altitude band). */
export interface EnvelopeRing {
  effectorId: string;
  center: GeoPoint;
  inner_km: number;          // min range (donut hole)
  outer_km: number;          // max range
  no_escape_km?: number | null;
  floor_km: number;          // altitude band floor
  ceiling_km: number;        // altitude band ceiling
  azimuth_deg: number;       // 360 or sector
  heading_deg: number;       // sector centre
  tier: EffectorTier;
  side: Side;
}

/** Great-circle distance (km) — for coverage tests without a map dependency. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Is a target point (at altitude) inside an effector's engagement volume? */
export function pointInEnvelope(
  ring: EnvelopeRing,
  target: GeoPoint,
  target_alt_km: number
): boolean {
  const d = haversineKm(ring.center, target);
  if (d < ring.inner_km || d > ring.outer_km) return false;
  if (target_alt_km < ring.floor_km || target_alt_km > ring.ceiling_km) return false;
  if (ring.azimuth_deg < 360) {
    const brg = bearingDeg(ring.center, target);
    const half = ring.azimuth_deg / 2;
    let diff = Math.abs(((brg - ring.heading_deg + 540) % 360) - 180);
    if (diff > half) return false;
  }
  return true;
}

/** Bearing from a→b in degrees true. */
export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Build a ring from a placed effector + its spec (for the map). */
export function buildEnvelopeRing(placed: PlacedEffector, e: EffectorSystem): EnvelopeRing {
  return {
    effectorId: e.id,
    center: placed.origin,
    inner_km: e.envelope.min_range_km,
    outer_km: e.envelope.max_range_km,
    no_escape_km: e.envelope.no_escape_range_km ?? null,
    floor_km: e.envelope.min_alt_km,
    ceiling_km: e.envelope.max_alt_km,
    azimuth_deg: e.envelope.azimuth_deg ?? 360,
    heading_deg: placed.heading_deg ?? 0,
    tier: e.tier,
    side: e.side,
  };
}

/**
 * Coverage-gap probe: given placed rings and a candidate ingress point/altitude,
 * which rings (if any) can engage it? Empty array = a gap (safe for the attacker,
 * a hole for the defender). This is the core of "plan around the polygon".
 */
export function ringsEngaging(
  rings: EnvelopeRing[],
  target: GeoPoint,
  target_alt_km: number
): EnvelopeRing[] {
  return rings.filter((r) => pointInEnvelope(r, target, target_alt_km));
}
