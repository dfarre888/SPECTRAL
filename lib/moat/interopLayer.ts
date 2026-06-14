/**
 * SPECTRAL — Moat-Builder 5
 * Interoperability Layer
 *
 * The smartest competitive move for a small sovereign player: be the adaptive-
 * pedagogy layer that PLUGS INTO what Defence already owns, rather than a walled
 * garden competing with it. This turns incumbents (AFSIM, VBS4) from competitors
 * into distribution channels, and makes SPECTRAL acquirable rather than roadkill.
 *
 * This module defines clean adapter INTERFACES. The concrete adapters that
 * touch real AFSIM/VBS4 engagement data are implemented in the accredited
 * environment (they handle controlled data). The interfaces and the SPECTRAL-
 * side orchestration are buildable now.
 */

// NOTE: The interop layer is agnostic to the world-state internals.
// In your repo, wire AdversaryIntent construction to your spectral.types.ts
// WorldState where the orchestrator builds intent. No direct import is needed here.

// ─────────────────────────────────────────────────────────────────────────────
// EXTERNAL SIMULATION ADAPTER — generic contract
// ─────────────────────────────────────────────────────────────────────────────

export type ExternalSim = 'AFSIM' | 'VBS4' | 'EADSIM' | 'CUSTOM';

/**
 * SPECTRAL's role in an integrated stack: it supplies the ADAPTIVE ADVERSARY
 * and the PEDAGOGY. The external sim supplies the high-fidelity environment
 * and/or the validated engagement physics.
 *
 * Two integration directions:
 *   1. SPECTRAL-as-brain:   SPECTRAL drives an adaptive red force; the external
 *                           sim resolves engagements and renders the environment.
 *   2. SPECTRAL-as-coach:   The external sim runs the exercise; SPECTRAL observes
 *                           and provides the learner model + curriculum loop.
 */
export type IntegrationMode = 'spectral_as_brain' | 'spectral_as_coach';

export interface ExternalSimAdapter {
  readonly sim: ExternalSim;
  readonly mode: IntegrationMode;

  /**
   * pushAdversaryIntent
   * SPECTRAL-as-brain: send the adaptive red-force INTENT (what the adversary
   * wants to achieve) to the external sim, which resolves the engagement using
   * ITS validated physics. SPECTRAL never needs the controlled engagement maths
   * because the accredited external sim already has it.
   */
  pushAdversaryIntent(intent: AdversaryIntent): Promise<ExternalSimAck>;

  /**
   * pullObservations
   * Pull the trainee's decisions and the exercise outcome back from the
   * external sim, normalised into SPECTRAL's observation format so the
   * learner model can consume it.
   */
  pullObservations(exerciseId: string): Promise<NormalisedObservation[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVERSARY INTENT — the safe, non-controlled output SPECTRAL produces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AdversaryIntent is deliberately INTENT, not EFFECT. SPECTRAL says
 * "the adversary attempts a decoy-heavy saturation from the east to deplete
 * the magazine" — it does NOT compute whether that succeeds. The external
 * accredited sim resolves the outcome. This is the boundary that keeps the
 * adaptive-adversary differentiator on the safe side of the line.
 */
export interface AdversaryIntent {
  exercise_id: string;
  turn: number;
  // High-level intent — the adaptive, pedagogically-motivated choice
  objective: string;                 // "deplete interceptor magazine"
  approach: string;                  // "decoy-heavy saturation from eastern axis"
  // Why SPECTRAL chose this — tied to the trainee's blind spot
  pedagogical_rationale: string;     // "trainee weak on magazine discipline under saturation"
  targets_competency: string;        // which competency this pressures
  // Force composition described at the TASKING level, not the lethality level
  composition_summary: string;       // "mixed real/decoy OWA package, high decoy ratio"
  // Platform ids reference the catalogue; performance resolved by the external sim
  platform_refs: string[];
}

export interface ExternalSimAck {
  accepted: boolean;
  external_exercise_id: string;
  message: string;
}

export interface NormalisedObservation {
  exercise_id: string;
  turn: number;
  timestamp: string;
  // The trainee's observed decisions, normalised from the external sim
  decisions: string[];
  context_flags: string[];
  decision_time_sec: number | null;
  // Outcome as reported BY THE EXTERNAL SIM (it owns the physics)
  outcome_summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPEN-BUILD PLACEHOLDER ADAPTERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The concrete AFSIM / VBS4 adapters live in the accredited environment because
 * they touch validated engagement data. In the open build, these placeholders
 * let everything compile, wire up, and be tested end-to-end without controlled
 * data or a real external sim connection.
 */
export function makeOpenBuildAdapter(sim: ExternalSim, mode: IntegrationMode): ExternalSimAdapter {
  return {
    sim,
    mode,
    async pushAdversaryIntent(intent: AdversaryIntent): Promise<ExternalSimAck> {
      return {
        accepted: true,
        external_exercise_id: `OPEN-${intent.exercise_id}`,
        message:
          `[OPEN BUILD] Adversary intent accepted by placeholder ${sim} adapter. ` +
          `In the accredited environment, the real ${sim} adapter resolves this intent ` +
          `using ${sim}'s validated engagement physics.`,
      };
    },
    async pullObservations(_exerciseId: string): Promise<NormalisedObservation[]> {
      // Open build returns nothing — real adapter pulls from the external sim.
      return [];
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export class InteropRegistry {
  private adapters = new Map<ExternalSim, ExternalSimAdapter>();

  register(adapter: ExternalSimAdapter): void {
    this.adapters.set(adapter.sim, adapter);
  }

  get(sim: ExternalSim): ExternalSimAdapter | undefined {
    return this.adapters.get(sim);
  }

  list(): ExternalSim[] {
    return Array.from(this.adapters.keys());
  }
}

export const interopRegistry = new InteropRegistry();
