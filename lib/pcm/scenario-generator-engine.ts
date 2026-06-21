
import type { SpectralCompetency, LongitudinalCompetencyRecord } from '@/lib/moat/learnerModel.types';
import type { PCM } from '@/lib/pcm/spectral.types';
import { querySpectral } from '@/lib/claude/client';

export interface ScenarioGenerationRequest {
  player_id: string;
  callsign: string;
  learner_record?: LongitudinalCompetencyRecord;
  duration_turns?: number;
}

export interface ScenarioConfiguration {
  id: string;
  title: string;
  generated_at: string;
  generation_rationale: string;
  primary_target_competency: SpectralCompetency;
  secondary_competencies: SpectralCompetency[];
  initial_world_state: Partial<PCM.WorldState>;
  inject_sequence: Array<{ turn: number; inject_id: string; rationale: string; target_competency: SpectralCompetency }>;
  deliberate_conditions: string[];
  instructor_focus_points: Array<{ turn_range: [number, number]; watch_for: string; competency: SpectralCompetency; if_trainee_does_X: string; if_trainee_does_Y: string }>;
  estimated_pd_envelope: { baseline_pd: number; under_trigger_pd: number };
  generation_method: 'ai_generated' | 'ai_assisted' | 'manual';
}

export const COMPETENCY_TO_CONDITION_MAP: Record<SpectralCompetency, { trigger_conditions: string[]; recommended_injects: string[]; complexity_modifier: number; pd_context: string }> = {
  magazine_management: { trigger_conditions: ['saturation'], recommended_injects: ['RED-001'], complexity_modifier: 1, pd_context: 'magazine' },
  threat_classification: { trigger_conditions: ['decoy_heavy'], recommended_injects: ['RED-004'], complexity_modifier: 1.1, pd_context: 'classification' },
  decision_under_uncertainty: { trigger_conditions: ['under_ew', 'night'], recommended_injects: ['RED-002', 'ENV-003'], complexity_modifier: 1.2, pd_context: 'Pd<0.025' },
  emcon_discipline: { trigger_conditions: ['arm_threat'], recommended_injects: ['RED-007'], complexity_modifier: 1, pd_context: 'emcon' },
  adaptation: { trigger_conditions: ['under_ew'], recommended_injects: ['RED-003'], complexity_modifier: 1.1, pd_context: 'adaptation' },
  roe_application: { trigger_conditions: ['degraded_comms'], recommended_injects: ['DOC-001'], complexity_modifier: 1, pd_context: 'roe' },
  sensor_employment: { trigger_conditions: ['night'], recommended_injects: ['ENV-001'], complexity_modifier: 0.9, pd_context: 'sensor' },
  contingency_planning: { trigger_conditions: ['degraded_comms'], recommended_injects: ['BLUE-001'], complexity_modifier: 0.9, pd_context: 'contingency' },
  situational_awareness: { trigger_conditions: ['saturation'], recommended_injects: ['RED-001'], complexity_modifier: 1, pd_context: 'sa' },
  tempo_and_initiative: { trigger_conditions: ['saturation'], recommended_injects: ['RED-002'], complexity_modifier: 0.9, pd_context: 'tempo' },
  resource_prioritisation: { trigger_conditions: ['saturation'], recommended_injects: ['RED-007'], complexity_modifier: 1.1, pd_context: 'priority' },
};

function pickCompetencies(record?: LongitudinalCompetencyRecord): SpectralCompetency[] {
  if (!record?.blind_spots?.length) return ['decision_under_uncertainty'];
  return record.blind_spots.filter((b) => b.status === 'active').slice(0, 3).map((b) => b.competency as SpectralCompetency);
}

export class ScenarioGeneratorEngine {
  async generateFromLearnerRecord(req: ScenarioGenerationRequest): Promise<ScenarioConfiguration> {
    const primary = pickCompetencies(req.learner_record)[0] ?? 'decision_under_uncertainty';
    const map = COMPETENCY_TO_CONDITION_MAP[primary];
    const under = primary === 'decision_under_uncertainty' ? 0.021 : 0.31 / map.complexity_modifier;
    const config: ScenarioConfiguration = {
      id: 'gen-' + Date.now(),
      title: 'EX ' + req.callsign,
      generated_at: new Date().toISOString(),
      generation_rationale: 'Pressure ' + primary,
      primary_target_competency: primary,
      secondary_competencies: [],
      initial_world_state: {},
      inject_sequence: [
        { turn: 4, inject_id: map.recommended_injects[0], rationale: map.pd_context, target_competency: primary },
        { turn: 14, inject_id: 'RED-002', rationale: 'Escalation window', target_competency: primary },
      ],
      deliberate_conditions: map.trigger_conditions,
      instructor_focus_points: [{ turn_range: [12, 16], watch_for: 'Low Pd contact', competency: primary, if_trainee_does_X: 'Coach', if_trainee_does_Y: 'Reinforce' }],
      estimated_pd_envelope: { baseline_pd: 0.31, under_trigger_pd: under },
      generation_method: 'ai_generated',
    };
    return this.refineWithAI(config);
  }

  async generateFromObjectives(req: ScenarioGenerationRequest) {
    return this.generateFromLearnerRecord(req);
  }

  private async refineWithAI(config: ScenarioConfiguration) {
    try {
      const raw = await querySpectral({ question: 'Return JSON with title and generation_rationale only', context: { platforms: [config] as object[] } });
      const parsed = parseJsonFence(raw);
      return { ...config, ...parsed, generation_method: 'ai_assisted' as const };
    } catch {
      return config;
    }
  }
}

export function parseJsonFence(raw: string): Record<string, unknown> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const body = (fenced ? fenced[1] : raw).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return {};
  try {
    return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const scenarioGeneratorEngine = new ScenarioGeneratorEngine();
