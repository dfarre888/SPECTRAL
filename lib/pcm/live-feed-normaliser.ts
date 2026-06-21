/**
 * SPECTRAL PCM — normalise external feed tracks to PCM contacts
 */
import type { PCM } from '@/lib/pcm/spectral.types';
import { gridToLatLon } from '@/lib/pcm/pcm-spectrum-bridge';
import type { RawFeedContact } from '@/lib/pcm/live-feed-adapter';

export const SOVEREIGN_FEED_BOUNDARY =
  'SOVEREIGN_FEED_BOUNDARY: accredited live-feed ingestion runs server-side in ap-southeast-2 only; open build uses synthetic stubs.';

export function latLonToTrainingGrid(lat: number, lon: number): string {
  const letter = String.fromCharCode(65 + Math.min(25, Math.max(0, Math.round((lat - 48) / 0.08))));
  const num = Math.max(1, Math.min(9, Math.round((lon - 11) / 0.12)));
  return letter + '-' + num;
}

export function normaliseFeedContact(raw: RawFeedContact, detectedBy: PCM.ForceId = 'BLUE'): PCM.Contact {
  const grid = latLonToTrainingGrid(raw.lat, raw.lon);
  const ref = gridToLatLon(grid);
  const rangeKm = Math.hypot((raw.lat - ref.lat) * 111, (raw.lon - ref.lon) * 111);
  return {
    contact_id: 'FEED-' + raw.track_id,
    true_platform_id: raw.track_id,
    detected_by: detectedBy,
    confidence: raw.confidence ?? 'possible',
    classification: raw.classification ?? 'unknown UAS',
    true_type: raw.classification ?? 'unknown',
    bearing_deg: 0,
    range_km: Math.max(0.1, rangeKm),
    altitude_m: raw.altitude_m ?? 100,
    speed_kt: null,
    detection_method: 'radar',
    detection_probability: 0.35,
    location_grid: grid,
    first_detected_turn: 0,
    last_updated_turn: 0,
    time_to_impact_turns: null,
    misclassified: false,
    report_delay_turns: 0,
  };
}

export function normaliseFeedBatch(raw: RawFeedContact[]): PCM.Contact[] {
  return raw.map((r) => normaliseFeedContact(r));
}

export function normaliseAccreditedLiveFeed(_raw: unknown): never {
  throw new Error(SOVEREIGN_FEED_BOUNDARY);
}
