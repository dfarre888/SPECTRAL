/** Swarm / saturation planner — leak-through vs magazine depth */
import { simulateSalvoDeterministic } from '@/lib/planner/engagement-economics';

export interface SwarmPreset {
  id: string;
  name: string;
  threatCount: number;
  pkPerShot: number;
  magazine: number;
  salvoSize: number;
}

export const SWARM_PRESETS: SwarmPreset[] = [
  { id: 'odessa-shahed', name: 'Odessa Shahed corridor', threatCount: 12, pkPerShot: 0.65, magazine: 6, salvoSize: 1 },
  { id: 'north-qld-belt', name: 'North QLD belt (8× Shahed)', threatCount: 8, pkPerShot: 0.7, magazine: 6, salvoSize: 1 },
];

export function analyseSwarm(preset: SwarmPreset) {
  const sim = simulateSalvoDeterministic(preset.magazine, preset.salvoSize, preset.pkPerShot, preset.threatCount);
  return {
    ...sim,
    preset,
    recommendation: sim.leakThroughProbability > 0.3
      ? 'Magazine insufficient — add Gepard/point-defence layer or accept leak-through ROE.'
      : 'Magazine adequate at stated Pk — monitor exchange ratio.',
  };
}

export interface SwarmSaturationInput {
  inboundCount: number;
  magazineRounds: number;
  reloadMin: number;
  interceptPk: number;
  salvoPerTarget: number;
  windowMin: number;
}

export function computeSwarmSaturation(input: SwarmSaturationInput) {
  const sim = simulateSalvoDeterministic(
    input.magazineRounds,
    input.salvoPerTarget,
    input.interceptPk,
    input.inboundCount,
  );
  const leakers = Math.max(0, input.inboundCount - sim.expectedKills);
  const magazineExhausted = sim.roundsExpended >= input.magazineRounds && leakers > 0;
  return {
    expectedKills: sim.expectedKills,
    leakers,
    leakThroughProbability: sim.leakThroughProbability,
    magazineExhausted,
    assessment: magazineExhausted
      ? 'Magazine exhausted before swarm defeated — unfavourable exchange; add point-defence layer.'
      : leakers > 0
        ? `${leakers} leaker(s) expected at stated Pk — tighten cueing or add RF layer.`
        : 'Magazine sufficient for inbound count at stated Pk.',
  };
}
