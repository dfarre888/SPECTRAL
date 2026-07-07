/**
 * SPECTRAL PCM Phase 3 — SPECTRAL-REF API (narrative + coaching only).
 */

import { callBedrock } from '@/lib/claude/bedrock';
import type { PCM } from '@/lib/pcm/spectral.types';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type AdjudicationResult = PCM.AdjudicationResult;

export const REF_MODEL_CONFIG = {
  max_tokens: 4096,
  temperature: 0.3,
} as const;

export interface RefRawResponse {
  reasoning: string;
  ds_briefing: string;
  blue_suggestion: string | null;
  proposed_inject_id: string | null;
}

export interface OversightGate {
  requires_ds_approval: boolean;
  proposed_result: AdjudicationResult;
  ds_approved: boolean;
  ds_player_id: string | null;
  ds_notes: string | null;
}

export const wrapInOversightGate = (
  result: AdjudicationResult,
  requireApproval = true,
  dsPlayerId: string | null = null,
): OversightGate => ({
  requires_ds_approval: requireApproval,
  proposed_result: result,
  ds_approved: !!dsPlayerId,
  ds_player_id: dsPlayerId,
  ds_notes: null,
});

export async function generateRefNarrative(
  resolvedWorldState: WorldState,
  redOrders: Order | null,
  blueOrders: Order | null,
): Promise<RefRawResponse> {
  const raw = await callBedrock({
    system: buildRefSystemPrompt(),
    userContent: buildRefUserMessage(resolvedWorldState, redOrders, blueOrders),
    maxTokens: REF_MODEL_CONFIG.max_tokens,
    temperature: REF_MODEL_CONFIG.temperature,
  });
  return parseRefRaw(raw);
}

function buildRefSystemPrompt(): string {
  return `You are SPECTRAL-REF, the directing-staff narrator for a military training wargame.

Your ONLY responsibilities:
1. Plain-language DS briefing from the resolved world state provided.
2. One Socratic coaching question for Blue — never give the answer.
3. Recommend at most one inject ID from the list, or null.

You do NOT resolve combat. Narrate and coach only.

Output strictly as JSON:
{"ds_briefing":"string","blue_suggestion":"string or null","proposed_inject_id":"string or null"}`;
}

function buildRefUserMessage(
  worldState: WorldState,
  redOrders: Order | null,
  blueOrders: Order | null,
): string {
  return JSON.stringify(
    {
      turn: worldState.turn,
      phase: worldState.phase,
      blue_contacts: worldState.all_contacts.filter((c) => c.detected_by === 'BLUE').length,
      red_contacts: worldState.all_contacts.filter((c) => c.detected_by === 'RED').length,
      blue_magazine_remaining: worldState.blue_force.magazine_remaining,
      blue_platforms_active: worldState.blue_force.platforms_active,
      red_platforms_active: worldState.red_force.platforms_active,
      available_injects: worldState.inject_queue.map((i) => ({ id: i.id, name: i.name })),
      red_orders_summary: redOrders?.mission ?? 'none',
      blue_orders_summary: blueOrders?.mission ?? 'none',
    },
    null,
    2,
  );
}

function parseRefRaw(raw: string): RefRawResponse {
  const clean = raw.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    return {
      reasoning: '',
      ds_briefing: parsed.ds_briefing ?? 'No briefing generated.',
      blue_suggestion: parsed.blue_suggestion ?? null,
      proposed_inject_id: parsed.proposed_inject_id ?? null,
    };
  } catch {
    return {
      reasoning: '',
      ds_briefing: 'REF narrative parse error — manual DS review required.',
      blue_suggestion: null,
      proposed_inject_id: null,
    };
  }
}
