/**
 * SPECTRAL PCM — live feed adapter boundary
 */
import type { PCM } from '@/lib/pcm/spectral.types';

export type FeedClassification = 'SYNTHETIC' | 'ACCREDITED_STUB' | 'LIVE_CONTRACT';

export interface RawFeedContact {
  track_id: string;
  lat: number;
  lon: number;
  altitude_m?: number;
  classification?: string;
  confidence?: PCM.ContactConfidence;
  source: string;
}

export interface LiveFeedSnapshot {
  contacts: RawFeedContact[];
  classification: FeedClassification;
  received_at: string;
}

export interface LiveFeedAdapter {
  readonly label: string;
  fetchSnapshot(): Promise<LiveFeedSnapshot>;
}
