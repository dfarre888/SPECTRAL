/**
 * SPECTRAL Persistent Combat Model
 * Phase 1 — Type Definitions
 *
 * Types live in the PCM namespace to avoid collision with lib/types Platform etc.
 * Import as: import type { PCM } from '@/lib/pcm/spectral.types'
 */

export namespace PCM {
// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type ExercisePhase =
  | 'setup'
  | 'permissive'
  | 'contested'
  | 'denied'
  | 'culminating'
  | 'complete';

export type TimeOfDay =
  | 'dawn'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'dusk'
  | 'night_transition'
  | 'night'
  | 'pre_dawn';

export type ForceId = 'RED' | 'BLUE';

export type PlatformStatus =
  | 'pre_launch'
  | 'airborne_tasked'
  | 'airborne_loiter'
  | 'airborne_returning'
  | 'ground_ready'
  | 'ground_reloading'
  | 'ground_maintenance'
  | 'destroyed'
  | 'mission_complete';

export type PlatformGroup =
  | 'OWA'                  // One-Way Attack (Shahed-class)
  | 'loitering_munition'   // Lancet, Switchblade etc.
  | 'FPV'                  // First-Person View drone
  | 'MALE_strike'          // Medium-Altitude Long Endurance strike
  | 'MALE_isr'             // MALE ISR only
  | 'HALE_isr'             // High-Altitude Long Endurance ISR
  | 'UCAV'                 // Unmanned Combat Aerial Vehicle
  | 'CCA'                  // Collaborative Combat Aircraft
  | 'nano_isr'             // Group 1 nano ISR
  | 'EW'                   // Electronic Warfare platform
  | 'decoy'                // Decoy platform
  | 'USV'                  // Uncrewed Surface Vessel
  | 'UGV'                  // Uncrewed Ground Vehicle
  | 'c_uas_detect'         // C-UAS detect layer
  | 'c_uas_defeat_kinetic' // C-UAS kinetic defeat
  | 'c_uas_defeat_ew'      // C-UAS EW defeat (jammer)
  | 'c_uas_defeat_dew';    // C-UAS directed energy defeat

export type GuidanceType =
  | 'GNSS_INS'
  | 'GNSS_INS_ATR'         // + Automatic Target Recognition
  | 'optical_AI_terminal'
  | 'fibre_optic_FPV'
  | 'RF_FPV'
  | 'anti_radiation'
  | 'laser_guided'
  | 'MMW_radar'            // Millimetre Wave radar seeker
  | 'autonomous_swarm'
  | 'pre_programmed';

export type InjectCategory =
  | 'environmental'
  | 'red_offensive'
  | 'blue_pressure'
  | 'doctrine_strategic';

export type InjectStatus = 'queued' | 'fired' | 'cancelled' | 'held';

export type DetectionMethod =
  | 'radar'
  | 'eo_ir'
  | 'rf_sigint'
  | 'acoustic'
  | 'visual'
  | 'ais'
  | 'reported';

export type ContactConfidence = 'confirmed' | 'high' | 'medium' | 'low' | 'possible';

export type CommsStatus =
  | 'nominal'
  | 'degraded_light'   // <20% degradation
  | 'degraded_moderate' // 20–50% degradation
  | 'degraded_heavy'   // 50–80% degradation
  | 'degraded_critical' // >80% degradation
  | 'severed';

export type TurnOutcome = 'continues' | 'blue_wins' | 'red_wins' | 'stalemate' | 'withdrawal';

export type PlayerRole = 'red_commander' | 'blue_commander' | 'ds' | 'observer' | 'ai';

// ─────────────────────────────────────────────────────────────────────────────
// TERRAIN
// ─────────────────────────────────────────────────────────────────────────────

export interface GridSquare {
  reference: string;         // e.g. "447", "ECHO-7"
  easting: number;
  northing: number;
  elevation_m: number;
}

export interface UrbanArea {
  grid: string;
  name: string;
  density: 'sparse' | 'moderate' | 'dense' | 'city';
  population: number;
  restricted: boolean;       // civilian casualty avoidance restriction
}

export interface Terrain {
  grid_datum: string;        // e.g. "UTM_zone_54S"
  primary_feature: string;   // e.g. "coastal_littoral"
  elevation_model: string;   // e.g. "SRTM_30m"
  urban_areas: UrbanArea[];
  choke_points: string[];    // named geographic choke points
  restricted_areas: string[];
  sea_border: boolean;
  sea_state?: number;        // Douglas scale 0–9, if maritime
}

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER
// ─────────────────────────────────────────────────────────────────────────────

export interface Weather {
  visibility_km: number;
  cloud_base_ft: number;
  wind_speed_kt: number;
  wind_bearing_deg: number;
  temperature_c: number;
  precipitation: 'none' | 'light_rain' | 'heavy_rain' | 'snow' | 'hail' | 'dust' | 'fog';
  sea_state: number;         // Douglas scale
  // Derived modifiers — calculated by FWE, stored for performance
  eo_ir_modifier: number;    // 0.0–1.0
  radar_modifier: number;    // 0.0–1.0
  rf_propagation_modifier: number; // 0.0–1.0
  fpv_flyable: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORMS
// ─────────────────────────────────────────────────────────────────────────────

export interface Platform {
  id: string;                // e.g. "RED-UAS-01"
  type: string;              // e.g. "Shahed-136"
  group: PlatformGroup;
  quantity: number;
  quantity_remaining: number;
  location_grid: string | string[];
  altitude_m: number | null; // null if ground
  status: PlatformStatus;
  fuel_state_percent: number;
  payload: string | string[];
  guidance: GuidanceType;
  sensor?: string;           // EO/IR gimbal type if ISR capable
  assigned_mission?: string;
  assigned_target?: string;  // contact ID
  ew_immune: boolean;        // true for fibre-optic FPV
  rcs_class: 'very_low' | 'low' | 'medium' | 'high'; // affects detection Pd
  speed_kt: number;
  ceiling_ft: number;
  range_km: number;
  endurance_hr: number;
}

export interface EWAsset {
  id: string;
  type: string;
  status: 'active' | 'inactive' | 'destroyed';
  location_grid: string;
  jam_bands: string[];       // ['L', 'S', 'C', 'X', 'Ku', 'Ka']
  effective_radius_km: number;
  // Derived: which Blue/Red platforms are currently affected
  affected_platform_ids: string[];
}

export interface C2Node {
  gcs_location: string;
  backup_gcs: string | null;
  link_health_percent: number;
  comms_status: CommsStatus;
  primary_waveform: string;  // e.g. "Link-16", "encrypted_UHF"
  backup_waveform: string;
}

export interface ForceOrbat {
  force_id: ForceId;
  platforms: Platform[];
  ew_assets: EWAsset[];
  c2: C2Node;
  comms_status: CommsStatus;
  // Running totals for quick reference
  platforms_active: number;
  platforms_destroyed: number;
  magazine_expended: number;   // kinetic intercepts fired (c-UAS)
  magazine_remaining: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS (FOG OF WAR OUTPUT)
// ─────────────────────────────────────────────────────────────────────────────

export interface Contact {
  contact_id: string;          // internal SPECTRAL ID — may not match true platform ID
  true_platform_id: string;    // SPECTRAL-REF only — never exposed to players
  detected_by: ForceId;
  confidence: ContactConfidence;
  classification: string;      // what the detecting force thinks it is
  true_type: string;           // SPECTRAL-REF only
  bearing_deg: number;
  range_km: number;
  altitude_m: number | null;
  speed_kt: number | null;
  detection_method: DetectionMethod;
  detection_probability: number; // Pd at time of detection
  first_detected_turn: number;
  last_updated_turn: number;
  time_to_impact_turns: number | null; // for OWA/LM on approach
  location_grid: string | null;
  misclassified: boolean;      // SPECTRAL-REF only — did sensor misidentify?
  report_delay_turns: number;  // how many turns before this contact reached commander
}

// ─────────────────────────────────────────────────────────────────────────────
// INJECTS
// ─────────────────────────────────────────────────────────────────────────────

export interface Inject {
  id: string;                  // e.g. "RED-001"
  name: string;
  category: InjectCategory;
  description: string;
  effect_summary: string;
  targets_weakness: string;
  teaching_objective: string;
  status: InjectStatus;
  scheduled_turn: number;
  fired_turn: number | null;
  triggered_by: 'scheduled' | 'spectral_escalation' | 'spectral_profile' | 'ds_manual';
  visible_to: 'referee_only' | 'ds' | 'red' | 'blue' | 'all';
  // State changes this inject causes when fired
  world_state_delta: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS (from AI or human players)
// ─────────────────────────────────────────────────────────────────────────────

export interface Order {
  order_id: string;
  turn: number;
  issued_by: ForceId;
  issued_by_role: PlayerRole;
  timestamp: string;
  // FRAGO structure
  situation: string;
  mission: string;
  execution: string;
  service_support: string | null;
  command_signal: string | null;
  // Platform-level tasking
  platform_tasks: PlatformTask[];
  raw_text: string;           // full order text as issued
}

export interface PlatformTask {
  platform_id: string;
  task: string;               // e.g. "ISR northern sector grid 447-512"
  target_grid?: string;
  target_contact_id?: string;
  weapon_release?: string;
  priority: 1 | 2 | 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADJUDICATION RESULT (SPECTRAL-REF output per turn)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdjudicationResult {
  turn: number;
  exercise_id: string;
  // What actually happened this turn (SPECTRAL-REF ground truth)
  events: AdjudicationEvent[];
  // Injects fired this turn
  injects_fired: string[];
  // World state after adjudication
  world_state_after: WorldState;
  // Sensor pictures for each force (fog of war applied)
  red_sensor_picture: Contact[];
  blue_sensor_picture: Contact[];
  // DS briefing (plain language)
  ds_briefing: string;
  // SPECTRAL suggestion for Blue Force player
  blue_suggestion: string | null;
  // Running outcome assessment
  outcome: TurnOutcome;
  blue_win_probability: number; // 0.0–1.0
  key_decision_this_turn: boolean;
}

export interface AdjudicationEvent {
  event_id: string;
  type:
    | 'detection'
    | 'weapon_release'
    | 'intercept_success'
    | 'intercept_fail'
    | 'impact'
    | 'platform_destroyed'
    | 'platform_damaged'
    | 'ew_effect'
    | 'comms_degradation'
    | 'inject_fired'
    | 'objective_status_change';
  description: string;
  affected_platform_ids: string[];
  visible_to_red: boolean;
  visible_to_blue: boolean;
  visible_to_ds: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLD STATE (the master object)
// ─────────────────────────────────────────────────────────────────────────────

export interface WorldState {
  // Identity
  exercise_id: string;
  scenario_id: string;
  turn: number;
  max_turns: number;
  time_elapsed_minutes: number;
  time_of_day: TimeOfDay;
  phase: ExercisePhase;
  outcome: TurnOutcome;
  /** ROE state applied by doctrine injects (Phase 1 meta field) */
  roe?: Record<string, unknown>;

  // Environment
  terrain: Terrain;
  weather: Weather;

  // Forces
  red_force: ForceOrbat;
  blue_force: ForceOrbat;

  // Contacts (SPECTRAL-REF ground truth — never exposed directly to players)
  all_contacts: Contact[];

  // Orders submitted this turn
  red_orders: Order | null;
  blue_orders: Order | null;

  // Inject management
  inject_queue: Inject[];
  injects_fired: Inject[];

  // Objective tracking
  objectives: Objective[];

  // Meta
  created_at: string;
  updated_at: string;
  version: number;            // optimistic locking
}

export interface Objective {
  id: string;
  force: ForceId | 'both';
  description: string;
  success_condition: string;
  status: 'active' | 'succeeded' | 'failed' | 'partial';
  weight: number;             // contribution to overall outcome assessment
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISES AND SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;               // e.g. "Operation IRON CROW"
  classification: string;
  difficulty: 'base' | 'advanced' | 'expert';
  terrain: Terrain;
  initial_weather: Weather;
  red_orbat: ForceOrbat;
  blue_orbat: ForceOrbat;
  objectives: Objective[];
  inject_library: Inject[];
  ds_objectives: string[];
  max_turns: number;
  description: string;
  threat_model: string;
  key_lesson: string;
  historical_basis: string;
}

export interface Exercise {
  id: string;
  scenario_id: string;
  session_number: number;
  status: 'setup' | 'active' | 'paused' | 'complete';
  difficulty?: 'base' | 'advanced' | 'expert';
  blind_mode?: boolean;
  // Player assignments
  red_player_id: string | null;    // null = AI (SPECTRAL-RED)
  blue_player_id: string | null;   // null = AI (SPECTRAL-BLU)
  ds_player_id: string;
  // State
  current_world_state: WorldState;
  current_turn?: number;
  red_orders_submitted?: boolean;
  blue_orders_submitted?: boolean;
  red_orders_current?: Order | null;
  blue_orders_current?: Order | null;
  turn_history?: TurnRecord[];
  // Outcome
  outcome: TurnOutcome | null;
  blue_final_win_probability: number | null;
  // Meta
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface TurnRecord {
  turn: number;
  world_state_snapshot: WorldState;
  red_orders: Order | null;
  blue_orders: Order | null;
  adjudication: AdjudicationResult;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER BEHAVIOUR PROFILES
// ─────────────────────────────────────────────────────────────────────────────

export interface TacticalTendency {
  pattern: string;
  description: string;
  observed_frequency: string;   // e.g. "4/4 sessions"
  confidence: number;           // 0.0–1.0
  exploit: string;              // how SPECTRAL exploits this
  sessions_observed: string[];  // exercise IDs
}

export interface KnowledgeGap {
  gap: string;
  description: string;
  evidence: string;
  curriculum_module: string;
  curriculum_slides: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sessions_observed: string[];
  resolved: boolean;
}

export interface ExploitRecommendation {
  priority: 1 | 2 | 3;
  action: string;
  expected_response: string;
  follow_on: string;
  expected_blue_state: string;
  confidence: number;
  based_on_tendencies: string[];
}

export interface PlayerProfile {
  player_id: string;
  callsign: string;
  force_preference: ForceId | 'both';
  session_history: string[];     // exercise IDs
  total_turns_observed: number;
  // Decision speed
  decision_speed_baseline_sec: number;
  decision_speed_under_ew_sec: number;
  decision_speed_under_saturation_sec: number;
  decision_speed_at_night_sec: number;
  decision_speed_assessment: string;
  // Profile
  tactical_tendencies: TacticalTendency[];
  knowledge_gaps: KnowledgeGap[];
  risk_profile: {
    tolerance: 'low' | 'medium' | 'high' | 'variable';
    assessment: string;
    exploit: string;
  };
  exploit_recommendations: ExploitRecommendation[];
  // Outcomes
  win_count: number;
  loss_count: number;
  stalemate_count: number;
  current_difficulty: 'base' | 'advanced' | 'expert';
  // Meta
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME TREE ENGINE OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

export interface GameTreeBranch {
  branch_id: string;
  decision_point_turn: number;
  decision_made: string;
  outcome: TurnOutcome;
  probability: number;
  requires: string;
  key_factor: string;
}

export interface PostGameAnalysis {
  exercise_id: string;
  generated_at: string;
  // Game tree
  simulations_run: number;
  branches: GameTreeBranch[];
  blue_win_probability: number;
  red_win_probability: number;
  stalemate_probability: number;
  // Key decision
  key_decision_turn: number;
  key_decision_description: string;
  key_decision_wrong_call_pct: number;
  key_decision_error_type: 'knowledge_gap' | 'tactical_error' | 'information_failure';
  // Curriculum
  curriculum_recommendations: CurriculumRecommendation[];
  // Next session
  next_session_recommendations: string[];
  // Full DS report text
  ds_report: string;
}

export interface CurriculumRecommendation {
  priority: 1 | 2 | 3;
  topic: string;
  module: string;
  content: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ─────────────────────────────────────────────────────────────────────────────
// API REQUEST / RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateExerciseRequest {
  scenario_id: string;
  difficulty: 'base' | 'advanced' | 'expert';
  red_player_id: string | null;
  blue_player_id: string | null;
  ds_player_id: string;
  blind_mode: boolean;          // each side sees only own ORBAT
}

export interface CreateExerciseResponse {
  exercise_id: string;
  initial_world_state: WorldState;
  red_sensor_picture: Contact[];
  blue_sensor_picture: Contact[];
  blue_suggestion: string | null;
  error?: string;
}

export interface SubmitOrdersRequest {
  exercise_id: string;
  force: ForceId;
  player_id: string;
  orders: Order;
}

export interface SubmitOrdersResponse {
  turn_complete: boolean;         // true when both forces have submitted
  awaiting_force: ForceId | null; // which force still needs to submit
  adjudication?: AdjudicationResult; // present when turn_complete = true
  error?: string;
}

export interface GetSensorPictureRequest {
  exercise_id: string;
  force: ForceId;
  player_id: string;
}

export interface GetSensorPictureResponse {
  turn: number;
  contacts: Contact[];
  comms_status: CommsStatus;
  ew_effects_active: string[];
  blue_suggestion: string | null;  // null for Red Force
  error?: string;
}

export interface GetWorldStateRequest {
  exercise_id: string;
  requester_role: PlayerRole;
}

// DS gets full world state; players get only their sensor picture
export type GetWorldStateResponse =
  | { role: 'ds'; world_state: WorldState; error?: string }
  | { role: PlayerRole; sensor_picture: Contact[]; error?: string };

export interface AdvanceTurnRequest {
  exercise_id: string;
  ds_player_id: string;
  force_advance?: boolean;      // DS override — advance even if orders not received
}

export interface AdvanceTurnResponse {
  new_turn: number;
  adjudication: AdjudicationResult;
  exercise_complete: boolean;
  post_game_analysis?: PostGameAnalysis;
  error?: string;
}

} // namespace PCM
