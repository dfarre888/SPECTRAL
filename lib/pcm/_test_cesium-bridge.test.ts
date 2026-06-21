/**
 * SPECTRAL PCM — spectral-cesium-bridge unit tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types';
import type { PCM } from '@/lib/pcm/spectral.types';
import {
  SPECTRAL_CESIUM_COLOURS,
  worldStateToCesiumEntities,
  buildDetectionEnvelopes,
  buildEngagementGeometry,
  buildFogOfWarOverlay,
  flyToScenario,
  clearSpectralLayers,
  computeScenarioBounds,
} from '@/lib/pcm/spectral-cesium-bridge';

function mockCesium(): CesiumModule {
  class ConstantProperty { constructor(public _v: unknown) {} }
  const color = { withAlpha: () => color };
  return {
    ConstantProperty: ConstantProperty as never,
    Cartesian3: {
      fromDegrees: (lon: number, lat: number, alt: number) => ({ lon, lat, alt }),
      fromDegreesArray: (arr: number[]) => arr,
    } as never,
    Color: { fromCssColorString: () => color, ORANGE: color } as never,
    Viewer: class {} as never,
  } as CesiumModule;
}

function mockViewer(): CesiumViewer {
  const entities: unknown[] = [];
  return {
    entities: {
      add: (e: unknown) => entities.push(e),
      remove: (e: unknown) => {
        const i = entities.indexOf(e);
        if (i >= 0) entities.splice(i, 1);
      },
      values: entities as never,
    },
    camera: { flyTo: (_: unknown) => undefined },
    scene: {},
  } as CesiumViewer;
}

const platform = (id: string, grid: string): PCM.Platform => ({
  id,
  type: 'test-uas',
  group: 'OWA',
  quantity: 1,
  quantity_remaining: 1,
  location_grid: grid,
  altitude_m: 100,
  ew_immune: false,
  rcs_class: 'low',
  speed_kt: 120,
  ceiling_ft: 15000,
  range_km: 200,
  endurance_hr: 4,
  status: 'airborne_loiter',
  fuel_state_percent: 100,
  payload: 'none',
  guidance: 'GNSS_INS',
  sensor: 'generic-radar',
});

const minimalWs = (): PCM.WorldState => ({
  exercise_id: 'ex-1', scenario_id: 'sc-1', turn: 1, max_turns: 12, time_elapsed_minutes: 15,
  time_of_day: 'morning', phase: 'contested', outcome: 'continues',
  terrain: { grid_datum: 'UTM', primary_feature: 'coastal', elevation_model: 'SRTM', urban_areas: [], choke_points: [], restricted_areas: [], sea_border: true, sea_state: 2 },
  weather: { visibility_km: 20, cloud_base_ft: 5000, wind_speed_kt: 5, wind_bearing_deg: 270, temperature_c: 18, precipitation: 'none', sea_state: 1, eo_ir_modifier: 1, radar_modifier: 1, rf_propagation_modifier: 1, fpv_flyable: true },
  red_force: { force_id: 'RED', comms_status: 'nominal', platforms_active: 1, platforms_destroyed: 0, magazine_expended: 0, magazine_remaining: 0, platforms: [platform('RED-1', 'F-3')], ew_assets: [{ id: 'EW-1', type: 'jammer', status: 'active', location_grid: 'G-4', jam_bands: ['L'], effective_radius_km: 12, affected_platform_ids: [] }], c2: { comms_status: 'nominal', gcs_location: 'R1', backup_gcs: null, link_health_percent: 100, primary_waveform: 'UHF', backup_waveform: 'VHF' } },
  blue_force: { force_id: 'BLUE', comms_status: 'nominal', platforms_active: 1, platforms_destroyed: 0, magazine_expended: 0, magazine_remaining: 8, platforms: [platform('BLUE-RADAR', 'E-5')], ew_assets: [], c2: { comms_status: 'nominal', gcs_location: 'D1', backup_gcs: null, link_health_percent: 100, primary_waveform: 'Link-16', backup_waveform: 'VHF' } },
  all_contacts: [], red_orders: null, blue_orders: null, inject_queue: [], injects_fired: [], objectives: [],
  created_at: '2026-06-21T00:00:00.000Z', updated_at: '2026-06-21T00:00:00.000Z', version: 1,
});

describe('spectral-cesium-bridge', () => {
  let Cesium: CesiumModule;
  let viewer: CesiumViewer;
  beforeEach(() => { Cesium = mockCesium(); viewer = mockViewer(); });

  it('exports force colour tokens', () => {
    expect(SPECTRAL_CESIUM_COLOURS.BLUE_FORCE).toBe('#4a9eff');
    expect(SPECTRAL_CESIUM_COLOURS.RED_FORCE).toBe('#f87171');
  });

  it('worldStateToCesiumEntities tags spectral platforms for ref role', () => {
    const out = worldStateToCesiumEntities(Cesium, viewer, minimalWs(), [], 'ref');
    expect(out.platformEntities.length).toBeGreaterThanOrEqual(2);
    expect((viewer.entities.values as unknown[]).length).toBeGreaterThan(0);
  });

  it('hides red platforms from blue role', () => {
    worldStateToCesiumEntities(Cesium, viewer, minimalWs(), [], 'blue');
    const ids = (viewer.entities.values as { id?: string }[]).map((e) => e.id);
    expect(ids.some((id) => id?.includes('RED'))).toBe(false);
  });

  it('adds contact entities from sensor picture', () => {
    const contact: PCM.Contact = { contact_id: 'C1', true_platform_id: 'R1', detected_by: 'BLUE', confidence: 'high', classification: 'OWA', true_type: 'OWA', bearing_deg: 90, range_km: 12, altitude_m: 80, speed_kt: 120, detection_method: 'radar', detection_probability: 0.8, first_detected_turn: 1, last_updated_turn: 1, time_to_impact_turns: 3, location_grid: 'F-4', misclassified: false, report_delay_turns: 0 };
    const out = worldStateToCesiumEntities(Cesium, viewer, minimalWs(), [contact], 'ref');
    expect(out.contactEntities).toHaveLength(1);
  });

  it('buildDetectionEnvelopes creates radar ellipses for blue defenders', () => {
    const env = buildDetectionEnvelopes(Cesium, viewer, minimalWs());
    expect(env.length).toBeGreaterThan(0);
  });

  it('buildEngagementGeometry draws lines for intercept events', () => {
    const adj: PCM.AdjudicationResult = { turn: 1, exercise_id: 'ex-1', events: [{ event_id: 'INT-1', type: 'intercept_success', description: 'Coyote intercept', affected_platform_ids: ['BLUE-RADAR'], visible_to_red: false, visible_to_blue: true, visible_to_ds: true }], injects_fired: [], world_state_after: minimalWs(), red_sensor_picture: [], blue_sensor_picture: [], ds_briefing: '', blue_suggestion: null, outcome: 'continues', blue_win_probability: 0.5, key_decision_this_turn: false };
    const lines = buildEngagementGeometry(Cesium, viewer, [], adj, minimalWs());
    expect(lines.length).toBe(1);
  });

  it('buildFogOfWarOverlay skips blue coverage for red role', () => {
    const fog = buildFogOfWarOverlay(Cesium, viewer, minimalWs(), [], 'red');
    expect(fog.blueCoverage).toHaveLength(0);
  });

  it('buildFogOfWarOverlay adds EW degradation zones for ref', () => {
    const fog = buildFogOfWarOverlay(Cesium, viewer, minimalWs(), [], 'ref');
    expect(fog.ewDegradationZones.length).toBeGreaterThan(0);
  });

  it('clearSpectralLayers removes tagged entities', () => {
    worldStateToCesiumEntities(Cesium, viewer, minimalWs(), [], 'ref');
    clearSpectralLayers(viewer);
    expect((viewer.entities.values as unknown[]).length).toBe(0);
  });

  it('computeScenarioBounds and flyToScenario use platform grids', () => {
    const bounds = computeScenarioBounds(minimalWs());
    expect(bounds[0]).toBeLessThan(bounds[2]);
    flyToScenario(Cesium, viewer, minimalWs());
  });
});
