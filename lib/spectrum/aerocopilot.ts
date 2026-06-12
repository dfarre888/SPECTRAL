/**
 * AeroCopilot — Level-4 reasoning engine (offline rules core).
 * ------------------------------------------------------------
 * Parses a natural-language query, reasons over the full data model
 * (platforms, radars, capabilities, engagement engine), and returns:
 *   - a written answer
 *   - optional NAVIGATION (take the user to a screen)
 *   - optional SELECTION (highlight/pre-select platforms or radars)
 *   - optional MAP placement suggestions
 *
 * This is the deterministic core. The same return shape is produced by the
 * Claude API path (see aerocopilot-llm.ts notes) so the UI is identical
 * whether reasoning is local or model-driven.
 */

import type { Platform, Side } from './types';
import type { RadarSystem, TargetClass, RadarMobility } from './radar-types';
import type { EffectorSystem } from './effector-types';
import { assessEngagement } from './engagement';
import { effectorsAgainst, killChainStatus, platformTargetClass } from './killchain';

export type CopilotScreen =
  | 'overview'
  | 'library'
  | 'detail'
  | 'engagement'
  | 'spectrum'
  | 'radar'
  | 'evolution'
  | 'map';

export interface CopilotAction {
  /** navigate the app to a screen */
  navigate?: CopilotScreen;
  /** platform/radar ids to highlight as selectable in the library/map */
  highlightIds?: string[];
  /** ids to auto-select (e.g. set Red/Blue in the planner) */
  selectRedId?: string;
  selectBlueId?: string;
  /** ids recommended to place on the map */
  placeIds?: string[];
  /** focus a single platform's dossier */
  detailId?: string;
}

export interface CopilotResponse {
  answer: string;
  /** short bulletised reasoning shown under the answer */
  reasoning?: string[];
  action?: CopilotAction;
  /** structured chips the UI can render (platform refs) */
  refs?: { id: string; name: string; side: Side }[];
  followups?: string[];
}

export interface CopilotContext {
  platforms: Platform[];
  radars: RadarSystem[];
  effectors?: EffectorSystem[];
}

/* ----------------------------- intent parsing ----------------------------- */

type Intent =
  | 'placement'        // "where should I place defensive systems"
  | 'what_can_i_use'   // "what drones can I use in this threat environment"
  | 'whatif'           // "what if I use X against Y"
  | 'compare'          // "compare X and Y"
  | 'counter'          // "how do I defeat X"
  | 'killchain'        // "can I find/fix/finish X" / "what's the kill chain on X"
  | 'explain_radar'    // "tell me about the S-400 radar / what band is X"
  | 'threat_assess'    // "what's the threat from X"
  | 'unknown';

const RX = {
  placement: /\b(where|place|position|emplace|site|deploy|put).*(defen|system|radar|jammer|effector|sam|battery|intercept)|defensive.*(placement|position|laydown)|layered defen/i,
  whatCanIUse: /\bwhat\s+(drones?|platforms?|aircraft|uas).*(use|fly|send|employ|operate)|which\s+(drones?|platforms?).*(survive|penetrate|use)/i,
  whatif: /\bwhat\s*if\b|\bif i (use|send|fly|deploy)\b|\bcould i (use|defeat|beat)\b/i,
  compare: /\bcompare\b|\bversus\b|\bvs\.?\b|\bdifference between\b/i,
  counter: /\bhow (do|can|would) i (defeat|beat|counter|stop|kill|engage|jam|down|intercept)\b|\bcounter\b|\bdefeat\b|\bintercept\b|\bshoot down\b/i,
  killchain: /\bkill chain\b|\bfind.{0,4}fix.{0,4}finish\b|\bf3\b|\bcan i (find|fix|finish|track|detect and)\b|\bengage(ment)? chain\b/i,
  explainRadar: /\b(radar|band|frequency|ghz|mhz)\b/i,
  threat: /\bthreat\b|\bdanger\b|\brisk\b|\bhow (dangerous|capable)\b/i,
};

function detectIntent(q: string): Intent {
  if (RX.placement.test(q)) return 'placement';
  if (RX.whatCanIUse.test(q)) return 'what_can_i_use';
  if (RX.killchain.test(q)) return 'killchain';
  if (RX.whatif.test(q)) return 'whatif';
  if (RX.compare.test(q)) return 'compare';
  if (RX.counter.test(q)) return 'counter';
  if (RX.threat.test(q)) return 'threat_assess';
  if (RX.explainRadar.test(q)) return 'explain_radar';
  return 'unknown';
}

/* ----------------------------- entity resolution ----------------------------- */

function findEntities(q: string, ctx: CopilotContext) {
  const ql = q.toLowerCase();
  // score each platform by how many of its distinctive tokens appear, and by
  // the length of the longest matching token (prefer specific names).
  const scoreName = (name: string, id: string): number => {
    const toks = nameTokens(name);
    let score = 0;
    let longest = 0;
    for (const t of toks) {
      if (ql.includes(t)) {
        score += 1;
        longest = Math.max(longest, t.length);
      }
    }
    if (id && ql.includes(id.replace(/-/g, ' '))) score += 2;
    // distinctive multi-word phrase bonus
    if (ql.includes(name.toLowerCase())) score += 3;
    return score + longest / 100;
  };

  const platScored = ctx.platforms
    .map((p) => ({ p, s: scoreName(p.name, p.id) }))
    .filter((x) => x.s >= 1)
    .sort((a, b) => b.s - a.s);

  const radarScored = ctx.radars
    .map((r) => ({
      r,
      s: scoreName(r.name, r.id) + (r.nato_name && ql.includes(r.nato_name.toLowerCase()) ? 3 : 0),
    }))
    .filter((x) => x.s >= 1)
    .sort((a, b) => b.s - a.s);

  // keep the best per side so "DroneGun vs Shahed" resolves one red + one blue
  const matchedPlatforms: Platform[] = [];
  const seenSides = new Set<string>();
  for (const { p } of platScored) {
    if (!seenSides.has(p.side)) {
      matchedPlatforms.push(p);
      seenSides.add(p.side);
    }
  }
  // also include any same-side top match if only one side mentioned
  if (matchedPlatforms.length === 1 && platScored.length > 1 && platScored[1].s >= 1.5) {
    // leave as-is; single strong entity
  }

  return {
    matchedPlatforms,
    matchedRadars: radarScored.map((x) => x.r),
  };
}

function nameTokens(name: string): string[] {
  // distinctive tokens (skip short/common words)
  return name
    .toLowerCase()
    .replace(/[()\/]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !['the', 'and', 'radar', 'system'].includes(t));
}

/* ----------------------------- main entry ----------------------------- */

export function askCopilot(query: string, ctx: CopilotContext): CopilotResponse {
  const intent = detectIntent(query);
  const { matchedPlatforms, matchedRadars } = findEntities(query, ctx);

  switch (intent) {
    case 'placement':
      return handlePlacement(query, ctx, matchedRadars);
    case 'what_can_i_use':
      return handleWhatCanIUse(query, ctx, matchedRadars);
    case 'killchain':
      return handleKillChain(query, ctx, matchedPlatforms);
    case 'whatif':
    case 'compare':
      return handleWhatIf(query, ctx, matchedPlatforms);
    case 'counter':
      return handleCounter(query, ctx, matchedPlatforms);
    case 'explain_radar':
      return handleExplainRadar(query, ctx, matchedRadars);
    case 'threat_assess':
      return handleThreat(query, ctx, matchedPlatforms, matchedRadars);
    default:
      return handleUnknown(query, ctx);
  }
}

/* ----------------------------- handlers ----------------------------- */

function handlePlacement(
  q: string,
  ctx: CopilotContext,
  radars: RadarSystem[]
): CopilotResponse {
  // recommend a layered defensive radar/effector laydown
  const blue = ctx.platforms.filter((p) => p.side === 'blue');
  const blueRadars = ctx.radars.filter((r) => r.side === 'blue');

  // pick a layered set: long-range EW → medium acquisition → C-UAS point defence
  const ew = blueRadars.find((r) => r.role === 'early_warning');
  const acq = blueRadars.find((r) => r.role === 'acquisition');
  const cuas = blueRadars.find((r) => r.role === 'counter_uas');
  const jammer = blue.find((p) => (p.capabilities ?? []).some((c) => c.fn.startsWith('jam_')));
  const hpm = blue.find((p) => (p.capabilities ?? []).some((c) => c.fn === 'hpm'));

  const layers = [ew, acq, cuas].filter(Boolean) as RadarSystem[];
  const placeIds = [
    ...layers.map((r) => r.id),
    ...(jammer ? [jammer.id] : []),
    ...(hpm ? [hpm.id] : []),
  ];

  return {
    answer:
      'For a layered defence, place sensors and effectors in depth so each covers the gap the next one can\'t. Long-range early-warning at the back to cue everything, medium-range acquisition mid-depth, and short-range counter-UAS plus a hard-kill option at the asset you\'re protecting. I\'ve highlighted a recommended laydown — open the map to position them.',
    reasoning: [
      ew ? `Early warning: ${ew.name} (${ew.bands.join('/')}-band, ~${ew.instrumented_range_km} km) — site high/rearward for maximum cueing range.` : 'No long-range EW radar in the library — consider adding one.',
      acq ? `Acquisition: ${acq.name} (~${acq.instrumented_range_km} km) — mid-depth, overlapping the EW coverage.` : '',
      cuas ? `Point defence: ${cuas.name} (small-UAS ~${cuas.range_vs_small_uas_km} km) — at the protected asset; cues the effector.` : '',
      jammer ? `Soft-kill: ${jammer.name} — co-locate with point defence for RF/GNSS engagement.` : '',
      hpm ? `Hard-kill / last resort: ${hpm.name} (HPM) — covers fibre-optic & swarm threats jamming can\'t touch.` : '',
      'Avoid co-siting emitters: separate radars so one ARM/SEAD strike cannot kill the whole picture.',
    ].filter(Boolean),
    action: { navigate: 'map', placeIds, highlightIds: placeIds },
    refs: [...layers, jammer, hpm].filter(Boolean).map((x: any) => ({ id: x.id, name: x.name, side: 'blue' as Side })),
    followups: [
      'What\'s the weakest layer in this laydown?',
      'Where are the coverage gaps against small drones?',
      'Show me the radar spectrum for these systems',
    ],
  };
}

function handleWhatCanIUse(
  q: string,
  ctx: CopilotContext,
  radars: RadarSystem[]
): CopilotResponse {
  // "what drones can I use in this threat environment" — survivability vs the
  // threat radars/effectors present. Score each Red/own UAS by how detectable it is.
  const threatRadars = radars.length
    ? radars
    : ctx.radars.filter((r) => r.side === 'red');
  const ownUAS = ctx.platforms.filter((p) => p.side === 'red'); // own/employable airframes catalogued red

  // a UAS is "usable" if the threat radars struggle to detect its class
  const detectsSmall = threatRadars.some((r) => r.can_detect.includes('small_uas'));
  const detectsLarge = threatRadars.some((r) => r.can_detect.includes('large_uas') || r.can_detect.includes('aircraft'));

  const survivable = ownUAS.filter((p) => {
    const small = (p.group ?? 5) <= 2;
    if (small && !detectsSmall) return true;     // small drone, no small-UAS radar present
    if (!small && !detectsLarge) return true;
    // RF-silent / low-RCS bonus
    const silent = (p.capabilities ?? []).some((c) => (c.defeat_resistance ?? []).includes('rf_silent'));
    return silent;
  });

  const highlightIds = survivable.map((p) => p.id);

  return {
    answer: survivable.length
      ? `Against the threat radars present, these airframes have the best chance of penetrating — I\'ve highlighted them in the library so you can select and place them. ${detectsSmall ? 'Note the environment includes small-UAS-capable radar, so even small drones are at risk.' : 'The environment lacks dedicated small-UAS radar, so small/low/slow platforms are favoured.'}`
      : 'Every airframe in the library is detectable by at least one threat radar present. Favour the lowest-RCS or RF-silent options and plan for attrition or stand-off employment.',
    reasoning: [
      `Threat radars considered: ${threatRadars.slice(0, 4).map((r) => r.name).join(', ')}${threatRadars.length > 4 ? '…' : ''}.`,
      detectsSmall ? 'Small-UAS detection present → small drones not automatically safe.' : 'No small-UAS radar → Group 1–2 platforms favoured.',
      'Fibre-optic / RF-silent platforms remain attractive (no RF for ELINT to find), but radar still sees the airframe.',
      'Consider terrain masking and low-altitude ingress to defeat line-of-sight radar.',
    ],
    action: { navigate: 'library', highlightIds },
    refs: survivable.slice(0, 6).map((p) => ({ id: p.id, name: p.name, side: p.side })),
    followups: [
      'Which of these can fly fully GNSS-denied?',
      'What if they add a counter-UAS radar?',
      'Plan an ingress route on the map',
    ],
  };
}

function handleWhatIf(
  q: string,
  ctx: CopilotContext,
  matched: Platform[]
): CopilotResponse {
  const red = matched.find((p) => p.side === 'red');
  const blue = matched.find((p) => p.side === 'blue');

  if (red && blue) {
    const result = assessEngagement(red, blue);
    return {
      answer: `${result.headline} ${result.detail}`,
      reasoning: result.recommendations,
      action: { navigate: 'engagement', selectRedId: red.id, selectBlueId: blue.id },
      refs: [
        { id: red.id, name: red.name, side: 'red' },
        { id: blue.id, name: blue.name, side: 'blue' },
      ],
      followups: [
        `What if ${red.name} goes fully autonomous?`,
        `What else can defeat ${red.name}?`,
        'Show the band overlap on the spectrum',
      ],
    };
  }

  if (matched.length) {
    return {
      answer: `I can run that engagement — pick the other side. You named ${matched.map((m) => m.name).join(' and ')}. Tell me the opposing threat or effector and I\'ll compute the outcome.`,
      action: { navigate: 'engagement', ...(red ? { selectRedId: red.id } : {}), ...(blue ? { selectBlueId: blue.id } : {}) },
      refs: matched.map((m) => ({ id: m.id, name: m.name, side: m.side })),
    };
  }

  return {
    answer: 'Name a Red threat and a Blue effector (for example, "what if I use DroneGun against a Shahed-136") and I\'ll run the engagement and explain the outcome.',
    action: { navigate: 'engagement' },
    followups: ['What if DroneGun vs DJI Mavic 3?', 'What if Leonidas HPM vs fibre-optic FPV?'],
  };
}

function handleCounter(
  q: string,
  ctx: CopilotContext,
  matched: Platform[]
): CopilotResponse {
  const red = matched.find((p) => p.side === 'red');
  if (!red) {
    return {
      answer: 'Tell me which threat you want to counter (e.g. "how do I defeat a Shahed-136") and I\'ll rank the effectors in your inventory by likely outcome, including the cost-exchange.',
      action: { navigate: 'library' },
      followups: ['How do I defeat a fibre-optic FPV drone?', 'How do I counter a DJI Mavic 3?'],
    };
  }

  // Prefer the F3 effector engine if effectors are loaded
  if (ctx.effectors && ctx.effectors.length) {
    const ranked = effectorsAgainst(red, ctx.effectors, 'blue');
    const effective = ranked.filter((a) => a.verdict === 'effective');
    const marginal = ranked.filter((a) => a.verdict === 'marginal');
    const best = effective.slice(0, 4);

    return {
      answer: best.length
        ? `Against ${red.name}, your best kinetic/DE options are ${best.map((a) => a.effector.name).join(', ')}. ${best[0].cost_exchange ? `Top pick exchange: ${best[0].cost_exchange}.` : ''} I\'ve staged them — open the map to see engagement envelopes.`
        : marginal.length
        ? `Nothing gives a clean, economical kill of ${red.name}. Marginal options: ${marginal.slice(0, 3).map((a) => a.effector.name).join(', ')} — capable but a poor cost-exchange. Favour a cheap layer (HPM/gun) if available.`
        : `No effector in your inventory can finish ${red.name}. You have a FINISH gap — add an appropriate shooter.`,
      reasoning: ranked.slice(0, 5).map((a) => `${a.effector.name}: ${a.verdict}${a.reasons[0] ? ` — ${a.reasons[0]}` : ''}`),
      action: { navigate: 'map', highlightIds: best.map((a) => a.effector.id), placeIds: best.map((a) => a.effector.id), detailId: red.id },
      refs: [{ id: red.id, name: red.name, side: 'red' }, ...best.slice(0, 3).map((a) => ({ id: a.effector.id, name: a.effector.name, side: 'blue' as Side }))],
      followups: [`What's the full kill chain on ${red.name}?`, `Can I find and fix ${red.name}?`, `What if ${red.name} comes in a swarm?`],
    };
  }

  // Fallback: platform-vs-platform engagement (Phase-1 behaviour)
  const blues = ctx.platforms.filter((p) => p.side === 'blue');
  const ranked = blues
    .map((b) => ({ b, r: assessEngagement(red, b) }))
    .sort((x, y) => verdictScore(y.r.verdict) - verdictScore(x.r.verdict));
  const best = ranked.filter((x) => x.r.verdict === 'defeat_likely').map((x) => x.b);
  return {
    answer: best.length
      ? `Against ${red.name}, your best defeat options are ${best.map((b) => b.name).join(', ')}.`
      : `No clean defeat of ${red.name} in your library. Consider HPM or kinetic.`,
    reasoning: ranked.slice(0, 5).map((x) => `${x.b.name}: ${x.r.verdict.replace('_', ' ')}`),
    action: { navigate: 'library', highlightIds: best.map((b) => b.id), detailId: red.id },
    refs: [{ id: red.id, name: red.name, side: 'red' }, ...best.slice(0, 4).map((b) => ({ id: b.id, name: b.name, side: 'blue' as Side }))],
    followups: [`What if ${red.name} is GNSS-denied capable?`],
  };
}

function handleKillChain(
  q: string,
  ctx: CopilotContext,
  matched: Platform[]
): CopilotResponse {
  const threat = matched.find((p) => p.side === 'red') ?? matched[0];
  if (!threat || !ctx.effectors) {
    return {
      answer: 'Name a threat and I\'ll walk the Find → Fix → Finish chain — whether you can detect it, get a weapons-quality track, and finish it, plus where the chain breaks.',
      followups: ['What\'s the kill chain on a Shahed-136?', 'Can I find, fix and finish a fibre-optic FPV?'],
    };
  }
  const kc = killChainStatus(threat, ctx.radars, ctx.effectors, 'blue');
  return {
    answer: `${kc.summary}. ${kc.broken_link ? `The weak link is ${kc.broken_link.toUpperCase()} — fix that first.` : 'All three links are in place.'}`,
    reasoning: [
      `FIND: ${kc.find.ok ? '✓' : '✗'} ${kc.find.note}${kc.find.radars.length ? ` (${kc.find.radars.map((r) => r.name).slice(0, 3).join(', ')})` : ''}`,
      `FIX: ${kc.fix.ok ? '✓' : '✗'} ${kc.fix.note}`,
      `FINISH: ${kc.finish.ok ? '✓' : '✗'} ${kc.finish.note}${kc.finish.effectors.length ? ` (${kc.finish.effectors.map((e) => e.name).slice(0, 3).join(', ')})` : ''}`,
    ],
    action: {
      navigate: kc.broken_link === 'finish' || !kc.broken_link ? 'map' : 'radar',
      detailId: threat.id,
      highlightIds: [...kc.find.radars.map((r) => r.id), ...kc.finish.effectors.map((e) => e.id)],
      placeIds: kc.finish.effectors.map((e) => e.id),
    },
    refs: [
      { id: threat.id, name: threat.name, side: threat.side },
      ...kc.finish.effectors.slice(0, 3).map((e) => ({ id: e.id, name: e.name, side: 'blue' as Side })),
    ],
    followups: [`How do I defeat ${threat.name}?`, `What sensor detects ${threat.name}?`, `Plan a defensive laydown vs ${threat.name}`],
  };
}

function handleExplainRadar(
  q: string,
  ctx: CopilotContext,
  radars: RadarSystem[]
): CopilotResponse {
  const r = radars[0];
  if (!r) {
    return {
      answer: 'Which radar? Name it (e.g. "what band is the S-400 Big Bird radar on?") and I\'ll give you its band, range, mobility, and what it can and can\'t see.',
      action: { navigate: 'spectrum' },
    };
  }
  return {
    answer: `${r.name}${r.nato_name ? ` (${r.nato_name})` : ''} is a ${r.side === 'red' ? 'threat' : 'friendly'} ${r.role.replace('_', ' ')} radar on the ${r.bands.join('/')}-band (${fmtGhz(r.freq_low_hz)}–${fmtGhz(r.freq_high_hz)}). It's ${r.mobility.replace('_', '-')}, reaches about ${r.instrumented_range_km ?? '?'} km, and ${r.can_detect.includes('stealth') ? 'has some counter-stealth capability' : 'is not a counter-stealth sensor'}. It cannot reliably detect ${r.cannot_detect.join(', ') || 'few target classes'}.`,
    reasoning: [
      ...(r.strengths ?? []).map((s) => `Strength: ${s}`),
      ...(r.limitations ?? []).map((l) => `Limitation: ${l}`),
    ],
    action: { navigate: 'spectrum', highlightIds: [r.id] },
    refs: [{ id: r.id, name: r.name, side: r.side }],
    followups: [`How do I defeat ${r.name}?`, `What else is on the ${r.bands[0]}-band?`],
  };
}

function handleThreat(
  q: string,
  ctx: CopilotContext,
  platforms: Platform[],
  radars: RadarSystem[]
): CopilotResponse {
  const red = platforms.find((p) => p.side === 'red');
  const redRadar = radars.find((r) => r.side === 'red');
  if (red) {
    return {
      answer: `${red.name}: ${red.intel_note ?? 'a catalogued threat.'} Open its dossier for the full spectral footprint and defeat assessment.`,
      action: { navigate: 'detail', detailId: red.id },
      refs: [{ id: red.id, name: red.name, side: 'red' }],
      followups: [`How do I defeat ${red.name}?`, `What can survive against ${red.name}?`],
    };
  }
  if (redRadar) return handleExplainRadar(q, ctx, [redRadar]);
  return handleUnknown(q, ctx);
}

function handleUnknown(q: string, ctx: CopilotContext): CopilotResponse {
  return {
    answer:
      'I can reason over the whole threat picture. Try asking me to: place defensive systems on the map, tell you which drones can survive a threat environment, run a what-if engagement (e.g. "DroneGun vs Shahed-136"), explain a radar\'s band and limitations, or recommend how to defeat a specific threat.',
    followups: [
      'Where should I place my defensive systems?',
      'What drones can I use against an S-400?',
      'How do I defeat a fibre-optic FPV drone?',
      'What band is the Big Bird radar on?',
    ],
  };
}

/* ----------------------------- helpers ----------------------------- */

function verdictScore(v: string): number {
  return { defeat_likely: 3, partial: 2, detect_only: 1, no_engagement: 0 }[v] ?? 0;
}
function fmtGhz(hz: number): string {
  return hz >= 1e9 ? `${(hz / 1e9).toFixed(1)} GHz` : `${(hz / 1e6).toFixed(0)} MHz`;
}
