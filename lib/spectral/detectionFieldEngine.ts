/**
 * SPECTRAL — Detection Field Engine
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { maskedByEarthBulge, maskedByRadioHorizon } from '@/lib/map/radio-horizon';
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain';
import { haversineM } from '@/lib/propagation/geo';
import type { DetectionSample, EmitterSpec, GeoPoint } from '@/lib/spectral/detection-types';
import {
  getRcsFacets,
  PD_LAUNCH_THRESHOLD,
  SNR_LOGISTIC_A,
  SNR_THRESHOLD_DB,
  type RcsFacets,
} from '@/lib/spectral/detectionPhysicsConstants';
import { inferRcsCategoryFromAsset } from '@/lib/spectral/rcs-category-map';
import type { MapUasAsset } from '@/lib/map/types';

function bearingDeg(fromLon: number, fromLat: number, toLon: number, toLat: number): number {
  const dLon = ((toLon - fromLon) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function depressionDeg(targetAltM: number, emitterAltM: number, rangeM: number): number {
  const dh = targetAltM - emitterAltM;
  if (rangeM <= 1) return 90;
  return Math.max(0, Math.min(90, (Math.atan2(dh, rangeM) * 180) / Math.PI));
}

function pdFromSnrDb(snrDb: number): number {
  return 1 / (1 + Math.exp(-SNR_LOGISTIC_A * (snrDb - SNR_THRESHOLD_DB)));
}

export class DetectionFieldEngine {
  aspectRcs(rcs: RcsFacets, aspect_deg: number, depression_deg: number): number {
    const a = ((aspect_deg % 360) + 360) % 360;
    const aRad = (a * Math.PI) / 180;

    const cosA = Math.cos(aRad);
    const sinA = Math.sin(aRad);
    const noseW = cosA * cosA;
    const beamW = sinA * sinA;

    const lateralFacet = cosA >= 0
      ? noseW * rcs.nose + beamW * rcs.beam
      : noseW * rcs.tail + beamW * rcs.beam;

    const topBlend = Math.min(1, Math.max(0, (depression_deg - 20) / 40));

    return (1 - topBlend) * lateralFacet + topBlend * rcs.top;
  }

  pdAtPoint(
    target: GeoPoint & { heading_deg: number },
    platformId: string,
    rcsFallback: RcsFacets,
    emitters: EmitterSpec[],
    options?: {
      categoryFallback?: Parameters<typeof getRcsFacets>[1];
      rcsOverride?: RcsFacets;
      emcon?: boolean;
    },
  ): DetectionSample {
    const resolved = platformId
      ? getRcsFacets(platformId, options?.categoryFallback ?? 'medium_uas')
      : { facets: rcsFallback, rcs_ref: 'OSINT_NOMINAL' as const, confidence: 'low' as const };
    const baseFacets = options?.rcsOverride ?? resolved.facets;

    let maxPd = 0;
    let dominantEmitterId: string | null = null;
    let sigmaM2 = 0;
    let inDetectionRange = false;

    for (const emitter of emitters) {
      if (!emitter.active) continue;

      const rangeM = haversineM(emitter.lat, emitter.lon, target.lat, target.lon);
      const rangeKm = rangeM / 1000;

      if (maskedByRadioHorizon(emitter.alt_m, target.alt_m, rangeM)) continue;
      if (maskedByEarthBulge(emitter.alt_m, target.alt_m, rangeM, target.terrainAMSL)) continue;

      const aspectToRadar = bearingDeg(target.lon, target.lat, emitter.lon, emitter.lat);
      const aspect = (aspectToRadar - target.heading_deg + 360) % 360;
      const depression = depressionDeg(target.alt_m, emitter.alt_m, rangeM);

      const sigma = this.aspectRcs(baseFacets, aspect, depression);
      sigmaM2 = Math.max(sigmaM2, sigma);

      const rEffKm =
        emitter.classRangeKm *
        Math.pow(Math.max(sigma, 0.001) / Math.max(emitter.referenceSigmaM2, 0.001), 0.25);

      const rangeTerm = rangeKm > 0 ? -40 * Math.log10(rangeKm / Math.max(rEffKm, 0.01)) : 0;
      const snrDb = SNR_THRESHOLD_DB + rangeTerm;
      let pd = pdFromSnrDb(snrDb);

      const agl = target.alt_m - target.terrainAMSL;
      if (agl <= 60) pd *= 0.82;
      if (agl <= 35) pd *= 0.72;
      if (options?.emcon) pd *= 0.38;

      pd = Math.min(1, Math.max(0, pd));
      if (pd > 0) inDetectionRange = true;
      if (pd > maxPd) {
        maxPd = pd;
        dominantEmitterId = emitter.id;
      }
    }

    return {
      pd: maxPd,
      maxPd,
      dominantEmitterId,
      sigmaM2,
      inDetectionRange,
    };
  }

  lowestSafeAltitude(
    lon: number,
    lat: number,
    terrainAMSL: number,
    heading_deg: number,
    platformId: string,
    asset: MapUasAsset,
    emitters: EmitterSpec[],
    ceilingAMSL_m: number,
    rcsOverride?: RcsFacets,
  ): number {
    const category = inferRcsCategoryFromAsset(asset);
    const { facets: fallback } = getRcsFacets(platformId || asset.id, category);
    const floor = terrainAMSL + 25;
    let low = floor;
    let high = Math.max(floor + 50, ceilingAMSL_m);

    for (let i = 0; i < 12; i++) {
      const mid = (low + high) / 2;
      const sample = this.pdAtPoint(
        { lon, lat, alt_m: mid, terrainAMSL, heading_deg },
        platformId || asset.id,
        fallback,
        emitters,
        { categoryFallback: category, rcsOverride },
      );
      if (sample.maxPd > PD_LAUNCH_THRESHOLD) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return Math.round(low);
  }
}

export const detectionFieldEngine = new DetectionFieldEngine();
