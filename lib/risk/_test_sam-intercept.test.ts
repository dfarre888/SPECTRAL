/**
 * SPECTRAL — SAM intercept profile tests
 */
import { describe, it, expect } from 'vitest';
import { getSamProfile } from '@/lib/risk/sam-intercept';

describe('sa-22-greyhound SAM profile', () => {
  it('exists in SAM_PROFILES', () => {
    expect(getSamProfile('sa-22-greyhound')).toBeDefined();
  });

  it('matches eff-pantsir-57e6 engagement envelope', () => {
    const p = getSamProfile('sa-22-greyhound')!;
    expect(p.seeker).toBe('active_radar');
    expect(p.min_range_m).toBe(1_200);
    expect(p.max_range_m).toBe(20_000);
    expect(p.min_alt_m).toBe(5);
    expect(p.max_alt_m).toBe(15_000);
    expect(p.reaction_time_s).toBe(6);
    expect(p.missiles_ready).toBe(12);
    expect(p.gnss_fc).toBe(true);
    expect(p.base_pk.fpv).toBe(0.20);
    expect(p.base_pk.owa).toBe(0.58);
    expect(p.base_pk.loitering_munition).toBe(0.48);
    expect(p.base_pk.tactical_isr).toBe(0.68);
    expect(p.base_pk.male).toBe(0.75);
    expect(p.base_pk.hale).toBe(0.55);
  });
});
