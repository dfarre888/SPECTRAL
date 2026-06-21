import type { PCM } from '@/lib/pcm/spectral.types';
import { gridToLatLon } from '@/lib/pcm/pcm-spectrum-bridge';

export function injectFeedContacts(existing: PCM.Contact[], incoming: PCM.Contact[]): PCM.Contact[] {
  const merged = [...existing];
  for (const c of incoming) {
    const locB = c.location_grid ? gridToLatLon(String(c.location_grid)) : gridToLatLon('ECHO-7');
    const dup = merged.some((e) => {
      const locA = e.location_grid ? gridToLatLon(String(e.location_grid)) : gridToLatLon('ECHO-7');
      const dLat = (locB.lat - locA.lat) * 111000;
      const dLon = (locB.lon - locA.lon) * 111000 * Math.cos((locA.lat * Math.PI) / 180);
      return Math.hypot(dLat, dLon) < 500;
    });
    if (!dup) merged.push(c);
  }
  return merged;
}
