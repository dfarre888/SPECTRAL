-- Seed: Operation IRON CROW — Phase 1 default scenario
-- Matches lib/pcm/_test_phase1.test.ts fixtures (OSINT training scenario)

INSERT INTO spectral_scenarios (
  name,
  code,
  classification,
  description,
  threat_model,
  key_lesson,
  historical_basis,
  primary_terrain,
  initial_weather,
  red_base_orbat,
  blue_base_orbat,
  objectives,
  inject_library,
  ds_objectives,
  max_turns,
  available_difficulties
) VALUES (
  'Operation IRON CROW',
  'IRON-CROW',
  'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
  'Coastal littoral defence against mass OWA saturation. Blue must protect a logistics node while managing a limited Coyote kinetic magazine against Shahed-class OWA and decoy packages.',
  'Mass OWA saturation (Shahed-136/Geran-2 class) with Krasukha-analogue EW support, Lancet loitering munition overwatch, and decoy saturation to exhaust Blue kinetic magazine.',
  'Magazine depth mathematics — reserving kinetic intercepts vs committing early on unconfirmed contacts.',
  'Assessed from Ukraine 2022–2026 OWA saturation TTPs and Red Sea maritime drone employment patterns (OSINT only).',
  '{
    "grid_datum": "UTM_zone_54S",
    "primary_feature": "coastal_littoral",
    "elevation_model": "SRTM_30m",
    "urban_areas": [
      {"grid": "447", "name": "Port Alpha", "density": "moderate", "population": 12000, "restricted": true}
    ],
    "choke_points": ["STRAIT_ALPHA"],
    "restricted_areas": ["CHARLIE_ZONE_CIVILIAN"],
    "sea_border": true,
    "sea_state": 2
  }'::jsonb,
  '{
    "visibility_km": 10,
    "cloud_base_ft": 3000,
    "wind_speed_kt": 10,
    "wind_bearing_deg": 270,
    "temperature_c": 18,
    "precipitation": "none",
    "sea_state": 1,
    "eo_ir_modifier": 1.0,
    "radar_modifier": 1.0,
    "rf_propagation_modifier": 1.0,
    "fpv_flyable": true
  }'::jsonb,
  '{
    "force_id": "RED",
    "platforms": [
      {
        "id": "RED-UAS-01", "type": "Shahed-136", "group": "OWA",
        "quantity": 24, "quantity_remaining": 24, "location_grid": "ECHO-7",
        "altitude_m": null, "status": "pre_launch", "fuel_state_percent": 100,
        "payload": "90kg_HE", "guidance": "GNSS_INS_ATR", "ew_immune": false,
        "rcs_class": "low", "speed_kt": 100, "ceiling_ft": 10000, "range_km": 2500, "endurance_hr": 5
      },
      {
        "id": "RED-UAS-02", "type": "Lancet-3", "group": "loitering_munition",
        "quantity": 8, "quantity_remaining": 8, "location_grid": "FOXTROT-3",
        "altitude_m": 1500, "status": "airborne_loiter", "fuel_state_percent": 67,
        "payload": "3kg_shaped_charge", "guidance": "optical_AI_terminal", "ew_immune": false,
        "rcs_class": "very_low", "speed_kt": 70, "ceiling_ft": 5000, "range_km": 70, "endurance_hr": 1
      }
    ],
    "ew_assets": [{
      "id": "RED-EW-01", "type": "Krasukha-4_analogue", "status": "active",
      "location_grid": "HOTEL-9", "jam_bands": ["L", "S", "C"],
      "effective_radius_km": 40, "affected_platform_ids": []
    }],
    "c2": {
      "gcs_location": "HOTEL-9", "backup_gcs": "INDIA-2",
      "link_health_percent": 71, "comms_status": "degraded_light",
      "primary_waveform": "encrypted_UHF", "backup_waveform": "fibre_optic_FPV"
    },
    "comms_status": "degraded_light",
    "platforms_active": 2, "platforms_destroyed": 0,
    "magazine_expended": 0, "magazine_remaining": 24
  }'::jsonb,
  '{
    "force_id": "BLUE",
    "platforms": [
      {
        "id": "BLUE-MALE-01", "type": "Bayraktar TB2", "group": "MALE_strike",
        "quantity": 2, "quantity_remaining": 2, "location_grid": "ALPHA-4",
        "altitude_m": 15000, "status": "airborne_tasked", "fuel_state_percent": 43,
        "payload": ["MAM-L", "MAM-L", "MAM-C", "MAM-C"], "guidance": "optical_AI_terminal",
        "sensor": "ASELFLIR-500", "assigned_mission": "ISR_northern_sector",
        "ew_immune": false, "rcs_class": "medium", "speed_kt": 70,
        "ceiling_ft": 27000, "range_km": 300, "endurance_hr": 27
      },
      {
        "id": "BLUE-CUAS-02", "type": "Coyote Block 2", "group": "c_uas_defeat_kinetic",
        "quantity": 12, "quantity_remaining": 12, "location_grid": "CHARLIE-3",
        "altitude_m": null, "status": "ground_ready", "fuel_state_percent": 100,
        "payload": "kinetic_warhead", "guidance": "MMW_radar", "ew_immune": false,
        "rcs_class": "low", "speed_kt": 80, "ceiling_ft": 10000, "range_km": 10, "endurance_hr": 0.5
      }
    ],
    "ew_assets": [{
      "id": "BLUE-EW-01", "type": "DroneGun_Mk4", "status": "active",
      "location_grid": "BRAVO-2", "jam_bands": ["S", "C", "X"],
      "effective_radius_km": 0.5, "affected_platform_ids": []
    }],
    "c2": {
      "gcs_location": "DELTA-1", "backup_gcs": null,
      "link_health_percent": 85, "comms_status": "degraded_light",
      "primary_waveform": "Link-16", "backup_waveform": "encrypted_VHF"
    },
    "comms_status": "degraded_light",
    "platforms_active": 2, "platforms_destroyed": 0,
    "magazine_expended": 0, "magazine_remaining": 12
  }'::jsonb,
  '[
    {"id": "OBJ-BLUE-01", "force": "BLUE", "description": "Defend coastal logistics node for 18 turns",
     "success_condition": "logistics_node_operational_at_turn_18", "status": "active", "weight": 0.7},
    {"id": "OBJ-RED-01", "force": "RED", "description": "Degrade Blue logistics node to below 50% capacity",
     "success_condition": "logistics_node_capacity_below_50pct", "status": "active", "weight": 0.7}
  ]'::jsonb,
  '[
    {"id": "RED-001", "name": "OWA saturation launch", "category": "red_offensive",
     "description": "24x Shahed-class OWA inbound from ECHO sector",
     "effect_summary": "Mass OWA package — magazine management test",
     "targets_weakness": "c-UAS magazine management", "teaching_objective": "Magazine depth mathematics",
     "status": "queued", "scheduled_turn": 8, "fired_turn": null,
     "triggered_by": "scheduled", "visible_to": "referee_only", "world_state_delta": {}},
    {"id": "BLUE-001", "name": "MALE ISR platform lost", "category": "blue_pressure",
     "description": "Blue TB2 lost to Lancet strike",
     "effect_summary": "Primary ISR asset destroyed",
     "targets_weakness": "ISR redundancy planning", "teaching_objective": "Degraded ISR operations",
     "status": "queued", "scheduled_turn": 12, "fired_turn": null,
     "triggered_by": "scheduled", "visible_to": "referee_only",
     "world_state_delta": {"blue_platform_lost": {"platform_id": "BLUE-MALE-01"}}}
  ]'::jsonb,
  ARRAY[
    'Maintain exercise tempo — 15 min per turn',
    'Fire injects only when teaching objective is clear',
    'Debrief magazine mathematics at Turn 8 inject'
  ],
  18,
  '{base,advanced,expert}'
);
