import { describe, expect, it } from 'vitest';
import { detectionFieldEngine } from '@/lib/spectral/detectionFieldEngine';
import {
  getRcsFacets,
  PD_BANDS,
  PLATFORM_RCS_CATALOGUE,
  RCS_CATEGORY_DEFAULTS,
  type RcsFacets,
} from '@/lib/spectral/detectionPhysicsConstants';
import type { EmitterSpec } from '@/lib/spectral/detection-types';

const baseFacets: RcsFacets = { nose: 0.05, beam: 0.4, tail: 0.15, top: 0.25 };

describe('DetectionFieldEngine — aspectRcs', () => {
  it('1. beam aspect exceeds nose-on for typical facets', () => {
    const nose = detectionFieldEngine.aspectRcs(baseFacets, 0, 5);
    const beam = detectionFieldEngine.aspectRcs(baseFacets, 90, 5);
    expect(beam).toBeGreaterThan(nose);
  });

  it('2. top facet dominates at high depression', () => {
    const topHeavy: RcsFacets = { nose: 0.05, beam: 0.2, tail: 0.15, top: 0.5 };
    const lowDep = detectionFieldEngine.aspectRcs(topHeavy, 90, 10);
    const highDep = detectionFieldEngine.aspectRcs(topHeavy, 90, 70);
    expect(highDep).toBeCloseTo(topHeavy.top, 3);
    expect(highDep).toBeGreaterThan(lowDep);
  });

  it('3. tail aspect uses tail facet near 180°', () => {
    const tail = detectionFieldEngine.aspectRcs(baseFacets, 180, 5);
    expect(tail).toBeGreaterThan(baseFacets.nose * 0.5);
  });
});

describe('DetectionFieldEngine — pdAtPoint', () => {
  const emitter: EmitterSpec = {
    id: 'radar-1',
    lon: 55.0,
    lat: 26.0,
    alt_m: 55,
    classRangeKm: 30,
    referenceSigmaM2: 0.1,
    active: true,
  };

  it('4. closer range yields higher Pd', () => {
    const far = detectionFieldEngine.pdAtPoint(
      { lon: 55.2, lat: 26.0, alt_m: 120, terrainAMSL: 50, heading_deg: 90 },
      'fpv-analog-5800',
      baseFacets,
      [emitter],
    );
    const near = detectionFieldEngine.pdAtPoint(
      { lon: 55.02, lat: 26.0, alt_m: 120, terrainAMSL: 50, heading_deg: 90 },
      'fpv-analog-5800',
      baseFacets,
      [emitter],
    );
    expect(near.maxPd).toBeGreaterThan(far.maxPd);
  });

  it('5. larger RCS yields higher Pd at same range', () => {
    const target = { lon: 55.12, lat: 26.0, alt_m: 150, terrainAMSL: 50, heading_deg: 0 };
    const smallFacets: RcsFacets = { nose: 0.01, beam: 0.02, tail: 0.01, top: 0.01 };
    const largeFacets: RcsFacets = { nose: 0.5, beam: 0.8, tail: 0.4, top: 0.5 };
    const small = detectionFieldEngine.pdAtPoint(target, '', smallFacets, [emitter]);
    const large = detectionFieldEngine.pdAtPoint(target, '', largeFacets, [emitter]);
    expect(large.maxPd).toBeGreaterThan(small.maxPd);
  });

  it('6. EMCON reduces Pd', () => {
    const active = detectionFieldEngine.pdAtPoint(
      { lon: 55.05, lat: 26.0, alt_m: 150, terrainAMSL: 50, heading_deg: 0 },
      'shahed-136',
      baseFacets,
      [emitter],
      { emcon: false },
    );
    const silent = detectionFieldEngine.pdAtPoint(
      { lon: 55.05, lat: 26.0, alt_m: 150, terrainAMSL: 50, heading_deg: 0 },
      'shahed-136',
      baseFacets,
      [emitter],
      { emcon: true },
    );
    expect(silent.maxPd).toBeLessThan(active.maxPd);
  });
});

describe('PD_BANDS', () => {
  it('7. bands cover full probability range', () => {
    expect(PD_BANDS[0].max).toBeLessThan(PD_BANDS[PD_BANDS.length - 1].max);
  });
});

describe('lowestSafeAltitude', () => {
  it('8. returns altitude at or above terrain floor', () => {
    const asset = {
      id: 'shahed-136',
      name: 'Shahed',
      slug: 'shahed-136',
      category: 'loitering_munition' as const,
      categoryLabel: 'OWA',
      image_url: null,
      max_altitude_agl_m: 500,
      altitude_reference: 'AGL' as const,
      max_range_km: 250,
      max_speed_kmh: 180,
      endurance_min: 120,
      climb_rate_mpm: 200,
    };
    const alt = detectionFieldEngine.lowestSafeAltitude(
      55.05,
      26.0,
      50,
      90,
      'shahed-136',
      asset,
      [],
      550,
    );
    expect(alt).toBeGreaterThanOrEqual(75);
  });
});

describe('getRcsFacets catalogue', () => {
  it('9. shahed-136 beam matches catalogue', () => {
    const known = getRcsFacets('shahed-136');
    expect(known.facets.beam).toBeCloseTo(0.45, 2);
  });

  it('10. unknown platform uses category fallback', () => {
    const unknown = getRcsFacets('made-up-platform-xyz', 'small_uas');
    expect(unknown.facets).toEqual(RCS_CATEGORY_DEFAULTS.small_uas);
    expect(unknown.confidence).toBe('low');
  });
});

describe('13. SOVEREIGN_CORE_BOUNDARY marker tests', () => {
  it('13a. sovereign entries have non-zero open nominals', () => {
    Object.entries(PLATFORM_RCS_CATALOGUE).forEach(([, entry]) => {
      if (entry.rcs_ref === 'SOVEREIGN_CORE_BOUNDARY') {
        expect(entry.facets.beam).toBeGreaterThan(0.001);
        expect(entry.facets.nose).toBeGreaterThan(0);
      }
    });
  });

  it('13b. LO platforms are marked SOVEREIGN_CORE_BOUNDARY', () => {
    const loIds = ['jassm-er', 'storm-shadow-scalp', 'taurus-kepd-350', 's-70-okhotnik', 'gj-11'];
    loIds.forEach((id) => {
      const entry = PLATFORM_RCS_CATALOGUE[id];
      expect(entry).toBeDefined();
      expect(entry.rcs_ref).toBe('SOVEREIGN_CORE_BOUNDARY');
    });
  });

  it('13c. getRcsFacets known, sovereign, and unknown paths', () => {
    const known = getRcsFacets('shahed-136');
    expect(known.facets.beam).toBeCloseTo(0.45, 2);
    expect(known.rcs_ref).toBe('OSINT_NOMINAL');

    const sovereign = getRcsFacets('jassm-er');
    expect(sovereign.rcs_ref).toBe('SOVEREIGN_CORE_BOUNDARY');
    expect(sovereign.facets.nose).toBeGreaterThan(0);

    const unknown = getRcsFacets('made-up-platform-xyz', 'small_uas');
    expect(unknown.facets).toEqual(RCS_CATEGORY_DEFAULTS['small_uas']);
    expect(unknown.confidence).toBe('low');
  });
});
