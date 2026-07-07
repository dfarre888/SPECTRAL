import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { DataConfidence, DefeatEffectiveness } from '@/lib/types'

export type CatalogueResolutionPath =
  | 'tenant_defeat_effectiveness'
  | 'tenant_platform_extensions'
  | 'accredited_resolver'

export interface CatalogueDataGap {
  id: string
  label: string
  reason: string
  resolution_path: CatalogueResolutionPath
  related_platform_id: string | null
  related_system_id: string | null
  resolved?: boolean
  caveat?: string | null
  supplement_count?: number
}

export interface TenantDefeatEffectivenessRow {
  id: string
  tenant_id: string
  platform_id: string | null
  defeat_system_id: string | null
  rf_jamming_pct: number | null
  kinetic_pct: number | null
  dew_pct: number | null
  pd_detect_pct: number | null
  data_provenance: string
  confidence: string
  classification: string
  source_notes: string | null
  approved_by: string | null
  created_by: string
  created_at: string
}

export interface TenantPlatformExtensionRow {
  id: string
  tenant_id: string
  platform_id: string
  name: string
  manufacturer: string | null
  category: string
  capabilities: unknown[]
  data_provenance: string
  classification: string
  approved: boolean
}

export const CATALOGUE_DATA_GAPS: CatalogueDataGap[] = [
  {
    id: 'edge-horizon-waveform-classified',
    label: 'REACH-S / Edge Horizon classified waveforms',
    reason:
      'Classified Edge Group waveform parameters are contract-gated and cannot ship in the OSINT Training catalogue.',
    resolution_path: 'accredited_resolver',
    related_platform_id: null,
    related_system_id: 'edge-horizon',
  },
  {
    id: 'edge-horizon-erp-accredited',
    label: 'Horizon ERP accredited figures',
    reason:
      'Exact effective radiated power (ERP) figures require accredited propagation engine data under customer contract — not OSINT-publishable.',
    resolution_path: 'tenant_defeat_effectiveness',
    related_platform_id: null,
    related_system_id: 'edge-horizon',
  },
  {
    id: 'mod-verified-pk-tier',
    label: 'MoD-verified Pk tables',
    reason:
      'Government-verified defeat probability (Pk) and detection probability (Pd) tables are not releasable in the global OSINT seed.',
    resolution_path: 'tenant_defeat_effectiveness',
    related_platform_id: null,
    related_system_id: null,
  },
]

const CONFIDENCE_MAP: Record<string, DataConfidence> = {
  Confirmed: 'high',
  Assessed: 'high',
  Estimated: 'estimated',
  Reported: 'medium',
  Suspected: 'estimated',
}

function tenantConfidenceToDataConfidence(confidence: string): DataConfidence {
  return CONFIDENCE_MAP[confidence] ?? 'medium'
}

export async function listCatalogueDataGaps(): Promise<CatalogueDataGap[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('catalogue_data_gaps').select('*').order('id')
    if (error || !data?.length) return CATALOGUE_DATA_GAPS
    return data as CatalogueDataGap[]
  } catch {
    return CATALOGUE_DATA_GAPS
  }
}

export async function listTenantDefeatEffectiveness(
  tenantId: string,
): Promise<TenantDefeatEffectivenessRow[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tenant_defeat_effectiveness')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (error) return []
    return (data ?? []) as TenantDefeatEffectivenessRow[]
  } catch {
    return []
  }
}

export function mergeTenantOverOsint(
  osint: DefeatEffectiveness | undefined,
  tenant: TenantDefeatEffectivenessRow | undefined,
): DefeatEffectiveness | undefined {
  if (!tenant) return osint
  if (!osint) {
    if (!tenant.platform_id || !tenant.defeat_system_id) return undefined
    return {
      id: tenant.id,
      platform_id: tenant.platform_id,
      defeat_system_id: tenant.defeat_system_id,
      rf_jamming_pct: tenant.rf_jamming_pct,
      kinetic_pct: tenant.kinetic_pct,
      dew_pct: tenant.dew_pct,
      data_confidence: tenantConfidenceToDataConfidence(tenant.confidence),
      is_immune: false,
      immune_reason: null,
      adjudication_rationale: tenant.source_notes,
      modifiers: [],
      recommended_response: null,
      weather_limited: false,
      swarm_engagement_pct: tenant.pd_detect_pct,
      special_notes: tenant.source_notes,
    }
  }

  return {
    ...osint,
    rf_jamming_pct: tenant.rf_jamming_pct ?? osint.rf_jamming_pct,
    kinetic_pct: tenant.kinetic_pct ?? osint.kinetic_pct,
    dew_pct: tenant.dew_pct ?? osint.dew_pct,
    swarm_engagement_pct: tenant.pd_detect_pct ?? osint.swarm_engagement_pct,
    data_confidence: tenantConfidenceToDataConfidence(tenant.confidence),
    special_notes: tenant.source_notes ?? osint.special_notes,
    adjudication_rationale: tenant.source_notes ?? osint.adjudication_rationale,
  }
}

export async function fetchTenantDefeatRows(
  tenantId: string,
  platformIds: string[],
  systemIds: string[],
): Promise<Map<string, TenantDefeatEffectivenessRow>> {
  const map = new Map<string, TenantDefeatEffectivenessRow>()
  if (!platformIds.length || !systemIds.length) return map

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tenant_defeat_effectiveness')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('platform_id', platformIds)
      .in('defeat_system_id', systemIds)

    for (const row of (data ?? []) as TenantDefeatEffectivenessRow[]) {
      if (row.platform_id && row.defeat_system_id) {
        map.set(`${row.platform_id}:${row.defeat_system_id}`, row)
      }
    }
  } catch {
    // offline — no tenant overrides
  }

  return map
}

export async function resolveTenantDefeatEffectiveness(
  tenantId: string,
  platformId: string,
  systemId: string,
  osint?: DefeatEffectiveness,
): Promise<DefeatEffectiveness | undefined> {
  const rows = await fetchTenantDefeatRows(tenantId, [platformId], [systemId])
  const tenant = rows.get(`${platformId}:${systemId}`)
  return mergeTenantOverOsint(osint, tenant)
}
