/**
 * SPECTRAL — Moat-Builder 4 (analytic half)
 * Force-Design & Procurement Decision-Support Output
 *
 * The training use case gets SPECTRAL in the door. THIS gets a capability
 * manager to fund it: a defensible analytic artifact answering procurement
 * questions — "how many interceptors does this force structure need against an
 * adaptive peer threat, and where does it break?"
 *
 * IMPORTANT BOUNDARY: this module STRUCTURES and PRESENTS analysis. The
 * underlying engagement outcomes it summarises are produced by the adjudication
 * core (accredited) or an external accredited sim (interop layer). In the open
 * build it operates over the safe placeholder outputs. It does not compute
 * lethality itself.
 */

// ─────────────────────────────────────────────────────────────────────────────
// FORCE-DESIGN QUESTION
// ─────────────────────────────────────────────────────────────────────────────

export interface ForceDesignQuestion {
  id: string;
  question: string;                  // "Is a 12-interceptor battery sufficient vs decoy-heavy saturation?"
  force_structure: ForceStructureOption[];
  threat_profile: string;            // described threat the force is tested against
  success_criterion: string;         // what "sufficient" means
  runs_requested: number;            // how many adaptive repetitions
}

export interface ForceStructureOption {
  label: string;                     // "Option A: 12 interceptors"
  composition: { platform_ref: string; quantity: number }[];
  notes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN RESULTS (consumed from accredited adjudication / external sim)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single run's summarised outcome. SPECTRAL does NOT compute the win/loss;
 * it receives it from the accredited engine and aggregates. In the open build,
 * these are placeholder/illustrative and clearly marked as such.
 */
export interface RunOutcome {
  option_label: string;
  run_index: number;
  outcome: 'force_succeeded' | 'force_failed' | 'marginal';
  // Resource consumption observed (from the accredited engine)
  resources_expended: Record<string, number>;
  failure_point: string | null;      // where/why it broke, if it did
  is_placeholder: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTIC ARTIFACT
// ─────────────────────────────────────────────────────────────────────────────

export interface ForceDesignFinding {
  option_label: string;
  runs: number;
  success_rate: number;              // 0..1
  marginal_rate: number;
  failure_rate: number;
  // Where it breaks (aggregated failure points)
  common_failure_points: { point: string; frequency: number }[];
  // Resource economics
  mean_resource_expenditure: Record<string, number>;
  // Plain-language assessment
  assessment: string;
  confidence_note: string;
}

export interface ForceDesignReport {
  question: ForceDesignQuestion;
  generated_at: string;
  findings: ForceDesignFinding[];
  // The headline a capability manager reads
  recommendation: string;
  // Honest caveats — credibility with an analytic audience depends on these
  caveats: string[];
  // Provenance — is this from the accredited engine or open placeholder?
  data_provenance: 'accredited_engine' | 'external_accredited_sim' | 'open_build_placeholder';
}

// ─────────────────────────────────────────────────────────────────────────────
// FORCE-DESIGN ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class ForceDesignEngine {

  /**
   * analyse
   * Aggregates run outcomes into a procurement-grade finding set.
   * Pure aggregation and presentation — no lethality computation.
   */
  analyse(
    question: ForceDesignQuestion,
    outcomes: RunOutcome[],
    now: string,
  ): ForceDesignReport {
    const isPlaceholder = outcomes.length === 0 || outcomes.some(o => o.is_placeholder);

    const byOption = new Map<string, RunOutcome[]>();
    for (const o of outcomes) {
      const arr = byOption.get(o.option_label) ?? [];
      arr.push(o);
      byOption.set(o.option_label, arr);
    }

    const findings: ForceDesignFinding[] = [];
    for (const opt of question.force_structure) {
      const runs = byOption.get(opt.label) ?? [];
      findings.push(this.buildFinding(opt.label, runs));
    }

    return {
      question,
      generated_at: now,
      findings,
      recommendation: this.buildRecommendation(findings, isPlaceholder),
      caveats: this.buildCaveats(isPlaceholder, question),
      data_provenance: isPlaceholder ? 'open_build_placeholder' : 'accredited_engine',
    };
  }

  private buildFinding(label: string, runs: RunOutcome[]): ForceDesignFinding {
    if (!runs.length) {
      return {
        option_label: label,
        runs: 0,
        success_rate: 0, marginal_rate: 0, failure_rate: 0,
        common_failure_points: [],
        mean_resource_expenditure: {},
        assessment: 'No run data available in the open build. In the accredited environment this option would be exercised against the adaptive threat for the requested number of runs.',
        confidence_note: 'Placeholder — no statistical confidence in the open build.',
      };
    }

    const n = runs.length;
    const success = runs.filter(r => r.outcome === 'force_succeeded').length;
    const marginal = runs.filter(r => r.outcome === 'marginal').length;
    const failure = runs.filter(r => r.outcome === 'force_failed').length;

    // Aggregate failure points
    const fpCounts = new Map<string, number>();
    for (const r of runs) {
      if (r.failure_point) fpCounts.set(r.failure_point, (fpCounts.get(r.failure_point) ?? 0) + 1);
    }
    const common_failure_points = Array.from(fpCounts.entries())
      .map(([point, frequency]) => ({ point, frequency }))
      .sort((a, b) => b.frequency - a.frequency);

    // Mean resource expenditure
    const resourceSums = new Map<string, number>();
    for (const r of runs) {
      for (const [k, v] of Object.entries(r.resources_expended)) {
        resourceSums.set(k, (resourceSums.get(k) ?? 0) + v);
      }
    }
    const mean_resource_expenditure: Record<string, number> = {};
    for (const [k, v] of resourceSums) mean_resource_expenditure[k] = Math.round((v / n) * 10) / 10;

    const successRate = success / n;
    return {
      option_label: label,
      runs: n,
      success_rate: successRate,
      marginal_rate: marginal / n,
      failure_rate: failure / n,
      common_failure_points,
      mean_resource_expenditure,
      assessment: this.assessOption(successRate, common_failure_points),
      confidence_note: n < 20
        ? `Indicative only — ${n} runs. Recommend ≥30 runs for a procurement-grade confidence interval.`
        : `${n} runs — adequate for an indicative procurement finding.`,
    };
  }

  private assessOption(
    successRate: number,
    failurePoints: { point: string; frequency: number }[],
  ): string {
    const pct = Math.round(successRate * 100);
    let base: string;
    if (successRate >= 0.85) base = `Robust: succeeds in ${pct}% of adaptive runs.`;
    else if (successRate >= 0.6) base = `Marginal: succeeds in ${pct}% of adaptive runs — sensitive to threat adaptation.`;
    else base = `Insufficient: succeeds in only ${pct}% of adaptive runs.`;

    if (failurePoints.length) {
      base += ` Primary failure mode: ${failurePoints[0].point}.`;
    }
    return base;
  }

  private buildRecommendation(findings: ForceDesignFinding[], isPlaceholder: boolean): string {
    if (isPlaceholder) {
      return 'OPEN BUILD: recommendation will be generated from real adaptive-run data once the analysis is executed in the accredited environment. The structure, aggregation, and reporting shown here are production-ready; only the underlying engagement outcomes require the accredited engine.';
    }
    const ranked = [...findings].sort((a, b) => b.success_rate - a.success_rate);
    const best = ranked[0];
    if (!best) return 'No options evaluated.';
    return `Recommended: ${best.option_label} (${Math.round(best.success_rate * 100)}% success against the adaptive threat). ${best.assessment}`;
  }

  private buildCaveats(isPlaceholder: boolean, question: ForceDesignQuestion): string[] {
    const caveats: string[] = [
      'Results reflect performance against the SPECTRAL adaptive threat model, not a guarantee of real-world outcome.',
      'The adaptive adversary optimises against the trainee/force; results are a stress-test, not a prediction.',
    ];
    if (isPlaceholder) {
      caveats.unshift('OPEN BUILD PLACEHOLDER — no real engagement data. Run in the accredited environment for a usable finding.');
    }
    if (question.runs_requested < 30) {
      caveats.push(`Requested ${question.runs_requested} runs; ≥30 recommended for procurement-grade confidence.`);
    }
    return caveats;
  }
}

export const forceDesignEngine = new ForceDesignEngine();
