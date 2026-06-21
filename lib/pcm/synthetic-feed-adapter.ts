import type { LiveFeedAdapter, LiveFeedSnapshot } from '@/lib/pcm/live-feed-adapter';
import { SOVEREIGN_FEED_BOUNDARY } from '@/lib/pcm/live-feed-normaliser';

export class SyntheticFeedAdapter implements LiveFeedAdapter {
  readonly label = 'SYNTHETIC — OPEN BUILD — NO REAL DATA';

  async fetchSnapshot(): Promise<LiveFeedSnapshot> {
    void SOVEREIGN_FEED_BOUNDARY;
    return {
      classification: 'SYNTHETIC',
      received_at: new Date().toISOString(),
      contacts: [
        { track_id: 'SYN-1', lat: 48.12, lon: 11.22, altitude_m: 120, classification: 'Group-1 UAS', source: 'synthetic' },
        { track_id: 'SYN-2', lat: 48.125, lon: 11.225, altitude_m: 90, classification: 'decoy', source: 'synthetic' },
      ],
    };
  }
}

export const syntheticFeedAdapter = new SyntheticFeedAdapter();
