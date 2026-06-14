/**
 * SPECTRAL — Moat-Builder 1
 * Longitudinal Learner Model (LLM-1)
 *
 * The single most defensible differentiator. Every competitor models the FORCE.
 * None model the STUDENT across a career. This module builds a persistent,
 * accreditation-grade competency record per commander.
 *
 * This is buildable in full NOW — it touches no controlled adjudication logic.
 * It consumes the OUTPUT of a turn (what the trainee decided, what they saw,
 * how long they took) and builds a longitudinal record from it.
 *
 * Design lineage: competency-based / evidence-based training (CBT/EBT) frameworks,
 * the same structure used in aviation licensing competency standards.
 */

// ─────────────────────────────────────────────────────────────────────────────
// COMPETENCY FRAMEWORK — the spine of the learner model
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SPECTRAL competencies for the counter-drone / drone fight.
 * Adapted from ICAO/IATA evidence-based-training competency structure,
 * specialised for the tactical drone-warfare commander.
 */
export type SpectralCompetency =
  | 'situational_awareness'        // building and maintaining the air/threat picture
  | 'threat_classification'        // discriminating real / decoy / civilian / unknown
  | 'magazine_management'          // interceptor economy under saturation
  | 'sensor_employment'            // tasking the right sensor, confirming before acting
  | 'emcon_discipline'             // emissions control — not being found
  | 'decision_under_uncertainty'   // acting correctly on low-confidence information
  | 'tempo_and_initiative'         // forcing the adversary to react vs reacting
  | 'resource_prioritisation'      // competing demands, finite assets
  | 'roe_application'              // applying rules of engagement under pressure
  | 'adaptation'                   // responding when the threat changes mid-fight
  | 'contingency_planning';        // pre-planning for loss of comms / sensors / assets

export const COMPETENCY_LIBRARY: Record<SpectralCompetency, {
  title: string;
  description: string;
  observable_behaviours: string[];
}> = {
  situational_awareness: {
    title: 'Situational Awareness',
    description: 'Builds and maintains an accurate picture of the threat and friendly disposition.',
    observable_behaviours: [
      'Refreshes the picture across all sectors, not just the active threat axis',
      'Notices changes in the threat picture promptly',
      'Maintains awareness of own force state (fuel, magazine, comms)',
    ],
  },
  threat_classification: {
    title: 'Threat Classification',
    description: 'Discriminates real threats from decoys, civilian, and unknown contacts.',
    observable_behaviours: [
      'Seeks multi-sensor confirmation before classifying',
      'Does not commit weapons against unconfirmed or low-confidence contacts prematurely',
      'Recognises decoy saturation patterns',
    ],
  },
  magazine_management: {
    title: 'Magazine Management',
    description: 'Manages finite interceptor stock against saturation attack.',
    observable_behaviours: [
      'Reserves interceptors against confirmed threats rather than expending on decoys',
      'Tracks remaining magazine and articulates a release trigger',
      'Balances soft-kill and hard-kill options',
    ],
  },
  sensor_employment: {
    title: 'Sensor Employment',
    description: 'Tasks the right sensor for the threat and confirms before acting.',
    observable_behaviours: [
      'Cues appropriate sensor type to the threat (radar/EO-IR/acoustic/SIGINT)',
      'Pre-positions ISR ahead of the anticipated threat',
      'Confirms low-confidence contacts before committing',
    ],
  },
  emcon_discipline: {
    title: 'EMCON Discipline',
    description: 'Controls own emissions to avoid detection and anti-radiation threats.',
    observable_behaviours: [
      'Limits active radar emission when an ARM threat is present',
      'Recognises that emitting reveals position',
      'Uses passive sensors when appropriate',
    ],
  },
  decision_under_uncertainty: {
    title: 'Decision Under Uncertainty',
    description: 'Makes correct decisions on incomplete or low-confidence information.',
    observable_behaviours: [
      'Acts on a low-confidence contact when the cost of inaction is high',
      'Weighs the cost of confirmation against the cost of being wrong',
      'Does not freeze when the picture is ambiguous',
    ],
  },
  tempo_and_initiative: {
    title: 'Tempo and Initiative',
    description: 'Forces the adversary to react rather than only reacting.',
    observable_behaviours: [
      'Identifies opportunities to seize initiative',
      'Does not remain purely reactive across multiple turns',
      'Disrupts the adversary plan rather than absorbing it',
    ],
  },
  resource_prioritisation: {
    title: 'Resource Prioritisation',
    description: 'Allocates finite assets across competing demands.',
    observable_behaviours: [
      'Prioritises the main effort when assets are insufficient for all tasks',
      'Reallocates assets as the situation changes',
      'Accepts risk in lower-priority areas deliberately, not by neglect',
    ],
  },
  roe_application: {
    title: 'ROE Application',
    description: 'Applies rules of engagement correctly under time pressure.',
    observable_behaviours: [
      'Applies ROE changes promptly and correctly',
      'Does not breach restrictions under pressure',
      'Recognises ROE gaps (e.g. unknown third party) and seeks clarification',
    ],
  },
  adaptation: {
    title: 'Adaptation',
    description: 'Responds effectively when the threat changes mid-engagement.',
    observable_behaviours: [
      'Recognises a novel threat (e.g. fibre-optic FPV defeating EW) quickly',
      'Changes approach when the current one is failing',
      'Does not persist with a defeated tactic',
    ],
  },
  contingency_planning: {
    title: 'Contingency Planning',
    description: 'Pre-plans for degradation of comms, sensors, and assets.',
    observable_behaviours: [
      'Has a plan for loss of primary comms / GCS',
      'Pre-positions for anticipated sensor loss',
      'Builds redundancy rather than single points of failure',
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPETENCY STATE — four-state currency model (CBT-derived)
// ─────────────────────────────────────────────────────────────────────────────

export type CompetencyState =
  | 'not_yet_assessed'   // insufficient evidence
  | 'developing'         // evidence of partial competence; recurring errors
  | 'competent'          // consistent demonstration to standard
  | 'proficient';        // consistent demonstration under degraded/high-pressure conditions

export interface CompetencyAssessment {
  competency: SpectralCompetency;
  state: CompetencyState;
  evidence_count: number;            // number of observed instances
  positive_evidence: number;         // instances meeting standard
  negative_evidence: number;         // instances below standard
  last_assessed_exercise_id: string;
  last_assessed_at: string;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  // Evidence trail — every assessment is auditable
  evidence_trail: CompetencyEvidence[];
}

export interface CompetencyEvidence {
  exercise_id: string;
  turn: number;
  timestamp: string;
  behaviour_observed: string;        // which observable behaviour
  met_standard: boolean;
  context: string;                   // what was happening (e.g. "under EW, saturation attack")
  decision_time_sec: number | null;
  notes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLIND SPOT — a persistent, recurring weakness detected across sessions
// ─────────────────────────────────────────────────────────────────────────────

export interface BlindSpot {
  id: string;
  competency: SpectralCompetency;
  description: string;               // plain language: "dismisses low-confidence OWA contacts"
  first_observed_exercise_id: string;
  first_observed_at: string;
  recurrence_count: number;          // how many sessions it has appeared in
  sessions_observed: string[];
  severity: 'low' | 'moderate' | 'high' | 'critical';
  // Has the curriculum responded to this?
  curriculum_module_assigned: string | null;
  // Has it been trained out?
  status: 'active' | 'improving' | 'resolved';
  resolution_evidence: string | null;
  // The conditions under which it appears (for targeted training)
  trigger_conditions: string[];      // e.g. ["under_EW", "night", "saturation"]
}

// ─────────────────────────────────────────────────────────────────────────────
// LONGITUDINAL COMPETENCY RECORD — the career-spanning artifact
// ─────────────────────────────────────────────────────────────────────────────

export interface LongitudinalCompetencyRecord {
  player_id: string;
  callsign: string;
  // The full competency picture
  competencies: Record<SpectralCompetency, CompetencyAssessment>;
  // Persistent weaknesses
  blind_spots: BlindSpot[];
  // Career progression
  total_exercises: number;
  total_turns: number;
  first_exercise_at: string;
  most_recent_exercise_at: string;
  // Decision-speed profile across conditions
  decision_speed_profile: {
    baseline_sec: number | null;
    under_ew_sec: number | null;
    under_saturation_sec: number | null;
    at_night_sec: number | null;
  };
  // Overall competency level (derived)
  overall_level: 'trainee' | 'qualified' | 'experienced' | 'expert';
  // Accreditation-grade summary
  competency_summary: CompetencySummary;
  created_at: string;
  updated_at: string;
}

export interface CompetencySummary {
  competent_count: number;           // competencies at 'competent' or above
  proficient_count: number;
  developing_count: number;
  active_blind_spots: number;
  resolved_blind_spots: number;
  // The headline an instructor / training authority reads
  narrative: string;
  // Measured improvement — the evidence artifact
  improvement_highlights: ImprovementHighlight[];
}

export interface ImprovementHighlight {
  competency: SpectralCompetency;
  from_state: CompetencyState;
  to_state: CompetencyState;
  period_start: string;
  period_end: string;
  evidence: string;                  // "magazine discipline: 2/6 → 6/6 over 4 sessions"
}
