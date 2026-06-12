/**
 * AeroCopilot — Claude API wiring (documented for Cursor).
 * ========================================================
 * The dock uses the offline `askCopilot` engine by default. To upgrade to a
 * true Level-4 reasoning assistant backed by Claude, implement a server route
 * that calls the Anthropic API and returns the SAME `CopilotResponse` shape so
 * the UI is unchanged.
 *
 * Recommended architecture (matches the A3DM stack):
 *   app/api/aerocopilot/route.ts  (Next.js Route Handler, runs server-side)
 *     - receives { query, context: { platforms, radars } }
 *     - calls Anthropic Messages API with AEROCOPILOT_SYSTEM + tools
 *     - returns CopilotResponse JSON
 *
 * Keep the ANTHROPIC_API_KEY server-side only (never in the client bundle).
 */

import type { Platform } from './types';
import type { RadarSystem } from './radar-types';
import type { EffectorSystem } from './effector-types';

/**
 * System prompt: AeroCopilot is a domain-expert C-UAS / EW / radar advisor.
 * It must ground every answer in the provided data and emit a structured
 * action so the app can navigate and pre-select.
 */
export const AEROCOPILOT_SYSTEM = `You are AeroCopilot, a Level-4 electromagnetic-spectrum and counter-UAS operations advisor embedded in a close-hold Allied training platform. You reason over a provided dataset of drone platforms, counter-drone effectors, and radar systems — never invent systems or specifications that are not in the data.

Your expertise spans: RF/comms datalinks, GNSS/NAVWAR, EO/IR, radar (HF→Ka bands, mobility, detection envelopes, ECCM), electronic warfare, SAM engagement chains, and counter-UAS layered defence.

For every user question you must:
1. Answer in clear, operator-grade language — direct, concise, doctrinally sound.
2. Ground claims in the supplied platforms/radars/capabilities. If the data can't support an answer, say so and state what's missing.
3. Reason about EFFECTIVE outcomes, not just band overlap: account for anti-jam hardening (CRPA), GNSS-denied/autonomous terminal guidance, RF-silent (fibre-optic) threats, and counter-stealth radar physics (lower bands see stealth but can't give weapons-grade lock).
4. Emit a structured "action" telling the app what to do:
   - navigate: one of overview|library|detail|engagement|spectrum|evolution|map
   - highlightIds / placeIds: platform or radar ids to highlight or place
   - selectRedId / selectBlueId: pre-select an engagement pairing
   - detailId: open a specific dossier
5. Offer 2-3 sharp follow-up questions.

Key teaching truths to uphold:
- RF/GNSS jamming does nothing to a fibre-optic (RF-silent) drone — recommend HPM or kinetic.
- A multi-constellation CRPA receiver (e.g. Shahed Gen-3/4) heavily resists GNSS jamming.
- An AI/MWIR terminal-guided munition can complete its attack GNSS-denied — link/nav jamming alone won't stop it.
- VHF/UHF radars detect stealth via resonance but lack the resolution for a fire-control lock; X-band locks but only sees VLO at short range.
- Layered defence: long-range EW (cue) → medium acquisition → point C-UAS + hard-kill; never co-site emitters (one SEAD strike shouldn't blind the whole picture).

Be honest about confidence: figures are open-source and some are estimated. Never overstate certainty about classified performance.

Respond ONLY with a JSON object matching this TypeScript type (no markdown, no preamble):
{
  "answer": string,
  "reasoning"?: string[],
  "action"?: { "navigate"?: string, "highlightIds"?: string[], "placeIds"?: string[], "selectRedId"?: string, "selectBlueId"?: string, "detailId"?: string },
  "refs"?: { "id": string, "name": string, "side": "red"|"blue"|"neutral" }[],
  "followups"?: string[]
}`;

/** Build the user-turn content: the question plus a compact data digest. */
export function buildCopilotUserMessage(
  query: string,
  platforms: Platform[],
  radars: RadarSystem[],
  effectors: EffectorSystem[] = []
): string {
  // Compact the data so the model sees ids + the fields it needs to reason.
  const plats = platforms.map((p) => ({
    id: p.id,
    name: p.name,
    side: p.side,
    group: p.group ?? null,
    category: p.category,
    caps: (p.capabilities ?? []).map((c) => ({
      fn: c.fn,
      layer: c.layer,
      label: c.label,
      resist: c.defeat_resistance ?? [],
    })),
  }));
  const rads = radars.map((r) => ({
    id: r.id,
    name: r.name,
    nato: r.nato_name,
    side: r.side,
    role: r.role,
    bands: r.bands,
    range_km: r.instrumented_range_km,
    mobility: r.mobility,
    can_detect: r.can_detect,
    cannot_detect: r.cannot_detect,
    eccm: r.eccm,
  }));
  const effs = effectors.map((e) => ({
    id: e.id,
    name: e.name,
    side: e.side,
    tier: e.tier,
    effect: e.effect,
    envelope: e.envelope,
    pk: e.pk_estimate,
    magazine: e.magazine,
    cost: e.cost_per_shot_usd,
    defeats: e.defeats,
    cannot_defeat: e.cannot_defeat,
    cueing_radar_ids: e.cueing_radar_ids,
  }));
  return `QUESTION: ${query}

DATASET (ground all answers in this — do not invent systems):
PLATFORMS = ${JSON.stringify(plats)}
RADARS = ${JSON.stringify(rads)}
EFFECTORS = ${JSON.stringify(effs)}`;
}

/**
 * Example Route Handler (for app/api/aerocopilot/route.ts) — pseudocode:
 *
 *   import Anthropic from '@anthropic-ai/sdk';
 *   const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 *   export async function POST(req: Request) {
 *     const { query, context } = await req.json();
 *     const msg = await anthropic.messages.create({
 *       model: 'claude-sonnet-4-20250514',
 *       max_tokens: 1200,
 *       system: AEROCOPILOT_SYSTEM,
 *       messages: [{ role: 'user', content: buildCopilotUserMessage(query, context.platforms, context.radars) }],
 *     });
 *     const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
 *     const json = JSON.parse(text.replace(/```json|```/g, '').trim());
 *     return Response.json(json);
 *   }
 *
 * Then in AeroCopilotDock.run(), swap the offline call for:
 *   const res = await fetch('/api/aerocopilot', { method:'POST', body: JSON.stringify({ query: q, context: { platforms, radars } }) }).then(r => r.json());
 *
 * Fallback: if the fetch fails, call the offline askCopilot() so the dock
 * always works even without the API.
 */
