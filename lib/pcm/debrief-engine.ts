/**
 * SPECTRAL Automated After Action Review Engine
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import type { PCM } from '@/lib/pcm/spectral.types';

export interface AARSection {
  heading: string;
  body: string;
  teaching_points: string[];
  events_referenced: string[];
}

export interface AARReport {
  exercise_id: string;
  total_turns: number;
  outcome: PCM.TurnOutcome;
  blue_win_probability_final: number;
  sections: AARSection[];
  key_decision_turns: number[];
  leaker_count_total: number;
  magazine_expended_total: number;
  red_platforms_launched: number;
  red_platforms_intercepted: number;
  ew_activations: number;
  debrief_text: string;
}

function layerFromDescription(desc: string): number | null {
  const m = desc.match(/layer=(\d+)/);
  return m ? Number(m[1]) : null;
}

function teachingPointsFromEvents(events: PCM.AdjudicationEvent[]): string[] {
  const points: string[] = [];
  for (const e of events) {
    const d = e.description.toLowerCase();
    if (d.includes('magazine empty') || d.includes('depleted')) {
      points.push('Magazine management — kinetic interceptors exhausted before wave defeated');
    }
    if (d.includes('scattered')) {
      points.push('GNSS jamming swarm coherence — EW denied coordinated TOT');
    }
    if (d.includes('ew-immune strategy')) {
      points.push('Red adaptive response to Blue EW — FPV mix shift observed');
    }
    if (d.includes('degraded_heavy') || d.includes('link to')) {
      points.push('C2 resilience under EW — link health critical');
    }
  }
  return [...new Set(points)];
}

export function buildAAR(
  exerciseId: string,
  turnRecords: PCM.TurnRecord[],
  finalState: PCM.WorldState,
): AARReport {
  let leakerCount = 0;
  let magazineExpended = 0;
  let launched = 0;
  let intercepted = 0;
  let ewActivations = 0;
  const keyDecisionTurns: number[] = [];
  const allEvents: PCM.AdjudicationEvent[] = [];
  const layerCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  for (const record of turnRecords) {
    const events = record.adjudication.events;
    allEvents.push(...events);
    if (record.adjudication.key_decision_this_turn) keyDecisionTurns.push(record.turn);
    ewActivations += events.filter((e) => e.type === 'ew_effect').length;
    for (const e of events) {
      if (e.type === 'intercept_success') {
        intercepted += 1;
        const layer = layerFromDescription(e.description);
        if (layer) layerCounts[layer] = (layerCounts[layer] ?? 0) + 1;
      }
      if (e.type === 'impact') leakerCount += 1;
      if (e.type === 'weapon_release' && e.description.toLowerCase().includes('wave activated')) {
        const m = e.description.match(/(\d+)/);
        if (m) launched += Number(m[1]);
      }
    }
  }

  magazineExpended = Math.max(intercepted, finalState.blue_force.magazine_expended ?? 0);
  const trainingPoints = teachingPointsFromEvents(allEvents);
  const finalProb = turnRecords.at(-1)?.adjudication.blue_win_probability ?? 0.5;

  const sections: AARSection[] = [
    {
      heading: 'SITUATION SUMMARY',
      body: 'Turns: ' + turnRecords.length + '. Phase: ' + finalState.phase + '. Outcome: ' + finalState.outcome + '.',
      teaching_points: [],
      events_referenced: [],
    },
    {
      heading: 'RED FORCE ACTIONS',
      body: 'Launched ~' + launched + '. EW activations: ' + ewActivations + '.',
      teaching_points: trainingPoints.filter((p) => p.includes('GNSS') || p.includes('Red')),
      events_referenced: [],
    },
    {
      heading: 'BLUE FORCE DEFENCE',
      body: 'DEW:' + layerCounts[1] + ' Kinetic:' + layerCounts[2] + ' EW:' + layerCounts[3] + '. Magazine:' + magazineExpended + '.',
      teaching_points: trainingPoints.filter((p) => p.includes('Magazine')),
      events_referenced: [],
    },
    {
      heading: 'KEY DECISIONS',
      body: keyDecisionTurns.length ? keyDecisionTurns.map((t) => 'Turn ' + t).join(', ') : 'None flagged.',
      teaching_points: [],
      events_referenced: [],
    },
    {
      heading: 'SYSTEM PERFORMANCE',
      body: 'EW events:' + ewActivations + '. GNSS swarm:' + allEvents.filter((e) => e.event_id.includes('SWARM-GNSS')).length + '.',
      teaching_points: trainingPoints.filter((p) => p.includes('C2')),
      events_referenced: [],
    },
    {
      heading: 'TRAINING OBJECTIVES',
      body: trainingPoints.join('; ') || 'Review layering and magazine discipline.',
      teaching_points: trainingPoints,
      events_referenced: [],
    },
  ];

  const report: AARReport = {
    exercise_id: exerciseId,
    total_turns: turnRecords.length,
    outcome: finalState.outcome,
    blue_win_probability_final: finalProb,
    sections,
    key_decision_turns: keyDecisionTurns,
    leaker_count_total: leakerCount,
    magazine_expended_total: magazineExpended,
    red_platforms_launched: launched,
    red_platforms_intercepted: intercepted,
    ew_activations: ewActivations,
    debrief_text: '',
  };
  report.debrief_text = aarToText(report);
  return report;
}

export function aarToText(aar: AARReport): string {
  const lines = [
    '=== SPECTRAL AFTER ACTION REVIEW ===',
    'Exercise: ' + aar.exercise_id + ' | Turns: ' + aar.total_turns + ' | Outcome: ' + aar.outcome,
    '',
  ];
  for (const s of aar.sections) {
    lines.push('--- ' + s.heading + ' ---', s.body);
    if (s.teaching_points.length) {
      lines.push('Teaching Points:');
      for (const p of s.teaching_points) lines.push('• ' + p);
    }
    lines.push('');
  }
  lines.push('=== END AAR ===');
  return lines.join('\n');
}
