/**
 * SPECTRAL PCM — live feed tests
 */
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/supabase/service-role-node', () => ({ createServiceRoleNodeClient: vi.fn(() => ({ from: vi.fn() })) }));
import { SOVEREIGN_FEED_BOUNDARY, normaliseFeedContact, normaliseFeedBatch, latLonToTrainingGrid } from '@/lib/pcm/live-feed-normaliser';
import { SyntheticFeedAdapter } from '@/lib/pcm/synthetic-feed-adapter';
import { injectFeedContacts } from '@/lib/pcm/feed-contact-merge';
import type { PCM } from '@/lib/pcm/spectral.types';

const baseContact = (id: string, grid: string): PCM.Contact => ({
  contact_id: id, true_platform_id: id, detected_by: 'BLUE', confidence: 'possible', classification: 'UAS', true_type: 'UAS',
  bearing_deg: 0, range_km: 5, altitude_m: 100, speed_kt: 60, detection_method: 'radar', detection_probability: 0.4,
  first_detected_turn: 1, last_updated_turn: 1, time_to_impact_turns: null, location_grid: grid, misclassified: false, report_delay_turns: 0,
});

describe('live-feed boundary and normaliser', () => {
  it('declares SOVEREIGN_FEED_BOUNDARY constant', () => {
    expect(SOVEREIGN_FEED_BOUNDARY).toContain('SOVEREIGN_FEED_BOUNDARY');
  });

  it('latLonToTrainingGrid returns grid token', () => {
    expect(latLonToTrainingGrid(48.12, 11.22)).toMatch(/^[A-Z]-\d+$/);
  });

  it('normaliseFeedContact maps feed track to PCM contact', () => {
    const c = normaliseFeedContact({ track_id: 'T1', lat: 48.12, lon: 11.22, source: 'synthetic' });
    expect(c.contact_id).toBe('FEED-T1');
    expect(c.location_grid).toBeTruthy();
  });

  it('normaliseFeedBatch maps all tracks', () => {
    expect(normaliseFeedBatch([{ track_id: 'A', lat: 48, lon: 11, source: 's' }, { track_id: 'B', lat: 48.1, lon: 11.1, source: 's' }])).toHaveLength(2);
  });

  it('synthetic adapter labels SYNTHETIC classification', async () => {
    const snap = await new SyntheticFeedAdapter().fetchSnapshot();
    expect(snap.classification).toBe('SYNTHETIC');
    expect(snap.contacts.length).toBeGreaterThan(0);
  });

  it('synthetic adapter label string includes SYNTHETIC for globe HUD', async () => {
    expect(new SyntheticFeedAdapter().label).toContain('SYNTHETIC');
  });

  it('injectFeedContacts merges non-duplicate contacts', () => {
    expect(injectFeedContacts([], [baseContact('C1', 'E-5')])).toHaveLength(1);
  });

  it('injectFeedContacts dedupes within 500m', () => {
    const a = baseContact('C1', 'E-5');
    const b = baseContact('C2', 'E-5');
    expect(injectFeedContacts([a], [b])).toHaveLength(1);
  });

  it('injectFeedContacts keeps distant contacts', () => {
    expect(injectFeedContacts([baseContact('C1', 'A-1')], [baseContact('C2', 'Z-9')])).toHaveLength(2);
  });

  it('normaliseFeedContact defaults confidence to possible', () => {
    expect(normaliseFeedContact({ track_id: 'X', lat: 48, lon: 11, source: 's' }).confidence).toBe('possible');
  });

  it('normaliseFeedContact sets detection method radar', () => {
    expect(normaliseFeedContact({ track_id: 'X', lat: 48, lon: 11, source: 's' }).detection_method).toBe('radar');
  });

  it('injectFeedContacts preserves existing list order', () => {
    const merged = injectFeedContacts([baseContact('C1', 'A-1')], [baseContact('C2', 'Z-9')]);
    expect(merged[0].contact_id).toBe('C1');
  });
});
