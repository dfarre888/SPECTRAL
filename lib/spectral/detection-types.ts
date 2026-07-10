/**
 * SPECTRAL — Detection field types
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

export interface GeoPoint {
  lon: number;
  lat: number;
  alt_m: number;
  terrainAMSL: number;
}

export interface EmitterSpec {
  id: string;
  lon: number;
  lat: number;
  alt_m: number;
  classRangeKm: number;
  referenceSigmaM2: number;
  active: boolean;
}

export interface DetectionSample {
  pd: number;
  maxPd: number;
  dominantEmitterId: string | null;
  sigmaM2: number;
  inDetectionRange: boolean;
}
