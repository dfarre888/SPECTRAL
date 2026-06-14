/**
 * SPECTRAL — Moat-Builder 3
 * Tactical Currency Engine
 *
 * The edge a sovereign tool has over a US program-of-record: speed of update.
 * The drone fight changes monthly. This module is the intake and review
 * pipeline that lets SPECTRAL incorporate new tactics, techniques and threats
 * faster than a slow procurement cycle — WITHOUT auto-trusting open-source
 * data and without touching the controlled core.
 *
 * Design principle: every update is a PROPOSAL that a subject-matter expert
 * must review and approve before it changes anything a trainee sees. The
 * engine accelerates curation; it never auto-publishes.
 */

// ─────────────────────────────────────────────────────────────────────────────
// DOCTRINE / TTP UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateType =
  | 'new_threat_platform'
  | 'new_tactic'                 // e.g. fibre-optic FPV defeating EW
  | 'capability_change'          // existing platform gains/loses capability
  | 'countermeasure'             // new counter to an existing threat
  | 'doctrine_shift'             // change in how a threat is employed
  | 'environmental';             // new operating-environment factor

export type UpdateStatus =
  | 'proposed'                   // ingested, awaiting SME review
  | 'under_review'
  | 'approved'                   // SME approved — may inform scenarios
  | 'rejected'
  | 'superseded';

export interface CurrencyUpdate {
  id: string;
  type: UpdateType;
  title: string;
  summary: string;               // plain-language, SME-authored or SME-reviewed
  // Where it came from — provenance is mandatory
  source_type: 'osint' | 'sme_input' | 'after_action' | 'partner_share';
  source_reference: string;
  detected_at: string;
  // What it would change in SPECTRAL (described, not auto-applied)
  proposed_effect: string;
  affects: {
    competencies: string[];      // which training competencies this touches
    scenarios: string[];         // which scenarios should be updated
    injects: string[];           // which injects this might add/modify
  };
  // Review workflow — the human gate
  status: UpdateStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  // Controlled-data flag — if the update would require controlled technical
  // data to implement, it is routed to the accredited environment, not here.
  requires_accredited_implementation: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class CurrencyEngine {

  /**
   * proposeUpdate
   * Registers a new currency update as a PROPOSAL. Never auto-applies.
   * Automatically flags updates that would need controlled data so they
   * route to the accredited environment instead of the open build.
   */
  proposeUpdate(input: Omit<CurrencyUpdate, 'id' | 'status' | 'reviewed_by' | 'reviewed_at' | 'review_notes' | 'requires_accredited_implementation'>): CurrencyUpdate {
    return {
      ...input,
      id: `CU-${Date.now()}`,
      status: 'proposed',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      requires_accredited_implementation: this.needsAccreditation(input.proposed_effect, input.type),
    };
  }

  /**
   * needsAccreditation
   * Heuristic gate: if implementing the update would require real performance /
   * survivability / weapon-effect data, it cannot be done in the open build.
   * It is marked for the accredited environment.
   */
  private needsAccreditation(proposedEffect: string, type: UpdateType): boolean {
    const controlledSignals = /pk|probability of kill|lethality|survivability|warhead|range table|seeker|terminal|penetration|kill chain|engagement outcome/i;
    if (controlledSignals.test(proposedEffect)) return true;
    // New threat platforms and capability changes usually need performance data
    if (type === 'new_threat_platform' || type === 'capability_change') return true;
    return false;
  }

  /**
   * review
   * SME approves or rejects. Only approved, non-controlled updates may inform
   * the open training content. Approved controlled updates are handed to the
   * accredited build.
   */
  review(
    update: CurrencyUpdate,
    decision: 'approved' | 'rejected',
    reviewer: string,
    notes: string,
    now: string,
  ): CurrencyUpdate {
    return {
      ...update,
      status: decision,
      reviewed_by: reviewer,
      reviewed_at: now,
      review_notes: notes,
    };
  }

  /**
   * getPublishable
   * Returns approved updates that can inform the OPEN training content
   * (pedagogy, scenario emphasis, inject narrative) — explicitly excluding
   * anything that needs accredited implementation.
   */
  getPublishable(updates: CurrencyUpdate[]): CurrencyUpdate[] {
    return updates.filter(u =>
      u.status === 'approved' && !u.requires_accredited_implementation,
    );
  }

  /**
   * getAccreditedQueue
   * Returns approved updates that must be implemented in the accredited
   * environment because they involve controlled data.
   */
  getAccreditedQueue(updates: CurrencyUpdate[]): CurrencyUpdate[] {
    return updates.filter(u =>
      u.status === 'approved' && u.requires_accredited_implementation,
    );
  }

  /**
   * currencyReport
   * Snapshot of how current the training content is — a selling point in
   * itself ("SPECTRAL reflects TTPs as recent as X").
   */
  currencyReport(updates: CurrencyUpdate[]): {
    total: number;
    pending_review: number;
    approved_open: number;
    routed_to_accredited: number;
    most_recent_approved: string | null;
  } {
    const approved = updates.filter(u => u.status === 'approved');
    const mostRecent = approved
      .map(u => u.reviewed_at)
      .filter((d): d is string => !!d)
      .sort()
      .pop() ?? null;

    return {
      total: updates.length,
      pending_review: updates.filter(u => u.status === 'proposed' || u.status === 'under_review').length,
      approved_open: this.getPublishable(updates).length,
      routed_to_accredited: this.getAccreditedQueue(updates).length,
      most_recent_approved: mostRecent,
    };
  }
}

export const currencyEngine = new CurrencyEngine();

// ─────────────────────────────────────────────────────────────────────────────
// SEED — illustrative current TTPs (UNCLASSIFIED, open-source derived)
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_CURRENCY_UPDATES: Partial<CurrencyUpdate>[] = [
  {
    type: 'new_tactic',
    title: 'Fibre-optic FPV defeats RF-based counter-UAS',
    summary: 'Fibre-optic guided FPV drones, tethered by spooling optical fibre, are immune to RF jamming and SIGINT detection. Observed at scale in Ukraine. Defeats the EW-centric counter-UAS investment; kinetic or acoustic-cued defeat only.',
    source_type: 'osint',
    proposed_effect: 'Add a training emphasis: recognise EW-immune threat; do not rely on EW defeat. Pedagogy and scenario-emphasis change only.',
  },
  {
    type: 'doctrine_shift',
    title: 'Decoy-heavy OWA packages to deplete interceptor magazines',
    summary: 'Attackers mix low-cost decoys with real OWA in high ratios to force defenders to expend interceptors on decoys. Magazine economics, not capability, becomes decisive.',
    source_type: 'osint',
    proposed_effect: 'Strengthen magazine-management and threat-classification training emphasis. Inject-narrative change only.',
  },
  {
    type: 'doctrine_shift',
    title: 'Turbojet OWA variants compress the intercept window',
    summary: 'Turbojet-powered OWA variants travel substantially faster than piston variants, reducing detection-to-impact time and stressing decision tempo.',
    source_type: 'osint',
    proposed_effect: 'Emphasise decision-tempo training under compressed timelines. Pedagogy change only; any speed/performance values resolved in accredited catalogue.',
  },
];
