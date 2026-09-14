/**
 * Engagement brief for a conflict incident: who was involved, what defeats
 * the attacker and how well, and what each side should do about it.
 *
 * Built only from data already in the instance (platform library, defeat
 * matrix adjudications, kill-chain model). Numbers keep their provenance;
 * where the matrix has no row the brief says so instead of guessing.
 * Pure: no network, no fs.
 */
import type { AntiDroneSystem, DefeatEffectiveness, Platform } from '@/lib/types'
import type { ConflictIncident } from '@/lib/conflicts/types'
import { resolveKillChain, type KillChainResult, type KillChainStage } from '@/lib/pcm/kill-chain'

export type DefeatMethodLabel = 'RF jamming' | 'kinetic' | 'directed energy'

export interface DefenceOption {
  system: AntiDroneSystem
  method: DefeatMethodLabel
  /** Adjudicated single-engagement defeat probability, percent. */
  pk: number
  confidence: string
  immune: boolean
  immuneReason: string | null
  rationale: string | null
  response: string | null
  conflictValidated: boolean
  chain: KillChainResult
  salvo3: KillChainResult
}

export interface AttackerFacts {
  platform: Platform
  facts: { label: string; value: string }[]
  /** Attributes that blunt particular defeat methods. Derived from library flags, never invented. */
  resilience: string[]
}

export interface EngagementBrief {
  incidentId: string
  attackers: AttackerFacts[]
  /** Systems named in the incident that are defeat systems rather than threats. */
  defendersNamed: AntiDroneSystem[]
  /** Ranked by Pk, per attacker. */
  options: Record<string, DefenceOption[]>
  /** Attacker-side reading: which defence classes are weak against this platform. */
  exploit: Record<string, string[]>
  unmatched: string[]
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function matchPlatform(token: string, platforms: Platform[]): Platform | null {
  const t = norm(token)
  const byId = platforms.find((p) => norm(p.id) === t)
  if (byId) return byId
  return platforms.find((p) => norm(p.name) === t || norm(p.name).includes(t) || (p.nato_reporting_name ? norm(p.nato_reporting_name) === t : false)) ?? null
}

function matchSystem(token: string, systems: AntiDroneSystem[]): AntiDroneSystem | null {
  const t = norm(token)
  return systems.find((s) => norm(s.id) === t || norm(s.name) === t || norm(s.name).includes(t)) ?? null
}

function bestMethod(e: DefeatEffectiveness, s: AntiDroneSystem): { method: DefeatMethodLabel; pk: number } | null {
  const cands: { method: DefeatMethodLabel; pk: number | null }[] = [
    { method: 'RF jamming', pk: e.rf_jamming_pct },
    { method: 'kinetic', pk: e.kinetic_pct },
    { method: 'directed energy', pk: e.dew_pct },
  ]
  // Prefer methods the system actually fields.
  const fielded = new Set((s.defeat_method ?? []).map((m) => String(m).toLowerCase()))
  const ok = cands.filter((c) => c.pk != null && (fielded.size === 0 || [...fielded].some((f) => c.method.toLowerCase().includes(f.slice(0, 3)))))
  const pool = ok.length ? ok : cands.filter((c) => c.pk != null)
  if (!pool.length) return null
  const best = pool.reduce((a, b) => ((b.pk ?? 0) > (a.pk ?? 0) ? b : a))
  return { method: best.method, pk: best.pk ?? 0 }
}

function stageConfidence(c: string): KillChainStage['confidence'] {
  return c === 'confirmed' || c === 'high' ? 'osint' : 'estimated'
}

/**
 * Detect and track stand-ins are OSINT-descriptive, ordered by the attributes
 * that actually drive them (RCS, speed, RF resilience), and stated in the basis
 * so the operator can see the assumption.
 */
function chainFor(p: Platform, s: AntiDroneSystem, method: DefeatMethodLabel, pk: number, confidence: string, salvo: number): KillChainResult {
  const rcs = p.radar_cross_section_m2
  const detectP = rcs == null ? 0.75 : rcs < 0.05 ? 0.45 : rcs < 0.5 ? 0.65 : 0.85
  const fast = (p.terminal_speed_kmh ?? p.max_speed_kmh ?? 0) > 600
  let trackP = fast ? 0.7 : 0.85
  if (method === 'RF jamming' && (p.frequency_hopping || p.gnss_independent)) trackP = Math.min(trackP, 0.55)
  const stages: KillChainStage[] = [
    { id: 'detect', label: 'Detect', p: detectP, basis: rcs == null ? 'RCS not in library; nominal detection assumed' : `RCS ${rcs} m² against ${s.effective_range_m} m effective range`, confidence: 'estimated' },
    { id: 'track', label: 'Track', p: trackP, basis: fast ? 'High closing speed compresses the track window' : 'Subsonic profile; track hold assumed', confidence: 'estimated' },
    { id: 'engage', label: 'Engage', p: pk / 100, basis: `Defeat matrix ${method} adjudication`, confidence: stageConfidence(confidence) },
  ]
  return resolveKillChain({ stages, salvoSize: salvo })
}

export function attackerFacts(p: Platform): AttackerFacts {
  const facts: { label: string; value: string }[] = []
  if (p.category) facts.push({ label: 'Class', value: String(p.category).replace(/_/g, ' ') })
  if (p.guidance_type) facts.push({ label: 'Guidance', value: String(p.guidance_type).replace(/_/g, ' ') })
  if (p.max_speed_kmh) facts.push({ label: 'Speed', value: `${p.max_speed_kmh} km/h` })
  if (p.terminal_speed_kmh) facts.push({ label: 'Terminal', value: `${p.terminal_speed_kmh} km/h` })
  if (p.range_km) facts.push({ label: 'Range', value: `${p.range_km} km` })
  if (p.service_ceiling_m) facts.push({ label: 'Ceiling', value: `${p.service_ceiling_m} m` })
  if (p.radar_cross_section_m2 != null) facts.push({ label: 'RCS', value: `${p.radar_cross_section_m2} m²` })
  if (p.warhead_kg) facts.push({ label: 'Warhead', value: `${p.warhead_kg} kg` })
  if (p.unit_cost_usd) facts.push({ label: 'Unit cost', value: `$${Math.round(p.unit_cost_usd / 1000)}k` })
  const resilience: string[] = []
  if (p.gnss_independent) resilience.push('GNSS-independent navigation: GNSS denial alone does not defeat it')
  if (p.nav_backup?.length) resilience.push(`Navigation backup: ${p.nav_backup.join(', ')}`)
  if (p.frequency_hopping) resilience.push('Frequency-hopping links: narrowband C2 jamming is degraded')
  if (p.ai_autonomous) resilience.push('Autonomous terminal phase: severing C2 late does not abort the attack')
  if (p.swarm_capable) resilience.push('Swarm capable: single-shot effectors saturate; magazine depth matters')
  if (p.radar_cross_section_m2 != null && p.radar_cross_section_m2 < 0.1) resilience.push('Low RCS: radar detection range is short; cue from acoustic/EO')
  if (p.stealth_features?.length) resilience.push(`Signature reduction: ${p.stealth_features.join(', ')}`)
  return { platform: p, facts, resilience }
}

export function buildEngagementBrief(args: {
  incident: ConflictIncident
  platforms: Platform[]
  systems: AntiDroneSystem[]
  effectiveness: DefeatEffectiveness[]
}): EngagementBrief | null {
  const { incident, platforms, systems, effectiveness } = args
  if (!incident.platforms_involved.length) return null
  const attackers: AttackerFacts[] = []
  const defendersNamed: AntiDroneSystem[] = []
  const unmatched: string[] = []
  for (const token of incident.platforms_involved) {
    const p = matchPlatform(token, platforms)
    if (p) {
      if (!attackers.some((a) => a.platform.id === p.id)) attackers.push(attackerFacts(p))
      continue
    }
    const s = matchSystem(token, systems)
    if (s) {
      if (!defendersNamed.some((d) => d.id === s.id)) defendersNamed.push(s)
      continue
    }
    unmatched.push(token)
  }
  if (!attackers.length && !defendersNamed.length) return { incidentId: incident.id, attackers, defendersNamed, options: {}, exploit: {}, unmatched }

  const byId = new Map(systems.map((s) => [s.id, s]))
  const options: Record<string, DefenceOption[]> = {}
  const exploit: Record<string, string[]> = {}
  for (const a of attackers) {
    const rows = effectiveness.filter((e) => e.platform_id === a.platform.id)
    const opts: DefenceOption[] = []
    const weak: { method: DefeatMethodLabel; pk: number }[] = []
    for (const e of rows) {
      const s = e.defeat_system ?? byId.get(e.defeat_system_id)
      if (!s) continue
      const bm = bestMethod(e, s)
      if (e.is_immune) {
        weak.push({ method: 'RF jamming', pk: 0 })
      }
      if (!bm && !e.is_immune) continue
      const pk = e.is_immune ? 0 : bm!.pk
      const method = bm?.method ?? 'RF jamming'
      if (pk < 40) weak.push({ method, pk })
      opts.push({
        system: s,
        method,
        pk,
        confidence: String(e.data_confidence),
        immune: e.is_immune,
        immuneReason: e.immune_reason,
        rationale: e.adjudication_rationale,
        response: e.recommended_response,
        conflictValidated: s.conflict_validated,
        chain: chainFor(a.platform, s, method, pk, String(e.data_confidence), 1),
        salvo3: chainFor(a.platform, s, method, pk, String(e.data_confidence), 3),
      })
    }
    opts.sort((x, y) => y.pk - x.pk || Number(y.conflictValidated) - Number(x.conflictValidated))
    options[a.platform.id] = opts
    const ex: string[] = []
    const weakMethods = new Map<DefeatMethodLabel, number>()
    for (const w of weak) weakMethods.set(w.method, (weakMethods.get(w.method) ?? 0) + 1)
    for (const [m, n] of weakMethods) ex.push(`${n} ${m} system${n === 1 ? '' : 's'} in the matrix adjudicate under 40%: route where that is the defence`)
    if (!opts.some((o) => o.pk >= 70)) ex.push('No system in the matrix reaches 70% single-shot: defender must rely on salvo depth or layering')
    ex.push(...a.resilience.map((r) => r.split(':')[0]))
    exploit[a.platform.id] = ex
  }
  return { incidentId: incident.id, attackers, defendersNamed, options, exploit, unmatched }
}
