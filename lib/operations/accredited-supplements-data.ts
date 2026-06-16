import type { DataConfidence, DefeatEffectiveness } from '@/lib/types'
import type { ConfidenceLevel } from '@/lib/propagation/types'

export type AccreditedProvenance = 'training_contract_analogue' | string

export interface AccreditedWaveformProfile {
  id: string
  system_id: string
  capability_fn: string
  label: string
  freq_low_hz: number
  freq_high_hz: number
  waveform_family: string
  bandwidth_hz: number | null
  hop_rate_hz: number | null
  data_provenance: AccreditedProvenance
  confidence: string
  caveat: string
}

export interface AccreditedErpProfile {
  id: string
  system_id: string
  capability_fn: string
  erp_dbm: number
  freq_hz: number
  data_provenance: AccreditedProvenance
  confidence: string
  caveat: string
}

export interface AccreditedDefeatPkRow {
  id: string
  platform_id: string
  defeat_system_id: string
  pd_detect_pct: number | null
  pk_rf_jamming_pct: number | null
  pk_kinetic_pct: number | null
  pk_dew_pct: number | null
  is_immune: boolean
  immune_reason: string | null
  data_provenance: AccreditedProvenance
  confidence: string
  caveat: string
}

const CONFIDENCE_MAP: Record<string, DataConfidence> = {
  Confirmed: 'high',
  Assessed: 'high',
  Estimated: 'estimated',
  Reported: 'medium',
  Suspected: 'estimated',
}

const NATO_CONFIDENCE_MAP: Record<string, ConfidenceLevel> = {
  Confirmed: 'Confirmed',
  Assessed: 'Assessed',
  Estimated: 'Estimated',
  Reported: 'Reported',
  Suspected: 'Suspected',
}

export const OFFLINE_ACCREDITED_WAVEFORMS: AccreditedWaveformProfile[] = [
  {
    id: 'acc-wf-edge-jam-control',
    system_id: 'edge-horizon',
    capability_fn: 'jam_control',
    label: 'Training analogue — 2.4 GHz ISM noise jam profile',
    freq_low_hz: 2.4e9,
    freq_high_hz: 2.4835e9,
    waveform_family: 'wideband_noise',
    bandwidth_hz: 50e6,
    hop_rate_hz: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Assessed',
    caveat: 'NOT classified Edge Group data. Synthetic training profile for Spectral Operations contract exercises only.',
  },
  {
    id: 'acc-wf-edge-jam-video',
    system_id: 'edge-horizon',
    capability_fn: 'jam_video',
    label: 'Training analogue — 5.8 GHz video downlink jam profile',
    freq_low_hz: 5.725e9,
    freq_high_hz: 5.875e9,
    waveform_family: 'wideband_noise',
    bandwidth_hz: 40e6,
    hop_rate_hz: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Assessed',
    caveat: 'NOT classified Edge Group data. Synthetic training profile for Spectral Operations contract exercises only.',
  },
  {
    id: 'acc-wf-edge-jam-gnss',
    system_id: 'edge-horizon',
    capability_fn: 'jam_gnss',
    label: 'Training analogue — GNSS L-band denial profile',
    freq_low_hz: 1.16e9,
    freq_high_hz: 1.61e9,
    waveform_family: 'gnss_chirp',
    bandwidth_hz: 2e6,
    hop_rate_hz: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Reported',
    caveat: 'NOT classified Edge Group data. Synthetic training profile for Spectral Operations contract exercises only.',
  },
  {
    id: 'acc-wf-edge-detect-rf',
    system_id: 'edge-horizon',
    capability_fn: 'detect_rf',
    label: 'Training analogue — wideband RF survey profile',
    freq_low_hz: 400e6,
    freq_high_hz: 6e9,
    waveform_family: 'wideband_survey',
    bandwidth_hz: 5.6e9,
    hop_rate_hz: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Assessed',
    caveat: 'NOT classified Edge Group data. Synthetic training profile for Spectral Operations contract exercises only.',
  },
]

export const OFFLINE_ACCREDITED_ERP: AccreditedErpProfile[] = [
  {
    id: 'acc-erp-edge-jam-control',
    system_id: 'edge-horizon',
    capability_fn: 'jam_control',
    erp_dbm: 47,
    freq_hz: 2.4415e9,
    data_provenance: 'training_contract_analogue',
    confidence: 'Assessed',
    caveat: 'NOT accredited propagation-engine output. Training-contract ERP analogue for exercise adjudication.',
  },
  {
    id: 'acc-erp-edge-jam-video',
    system_id: 'edge-horizon',
    capability_fn: 'jam_video',
    erp_dbm: 45,
    freq_hz: 5.8e9,
    data_provenance: 'training_contract_analogue',
    confidence: 'Assessed',
    caveat: 'NOT accredited propagation-engine output. Training-contract ERP analogue for exercise adjudication.',
  },
  {
    id: 'acc-erp-edge-jam-gnss',
    system_id: 'edge-horizon',
    capability_fn: 'jam_gnss',
    erp_dbm: 43,
    freq_hz: 1.57542e9,
    data_provenance: 'training_contract_analogue',
    confidence: 'Reported',
    caveat: 'NOT accredited propagation-engine output. Training-contract ERP analogue for exercise adjudication.',
  },
  {
    id: 'acc-erp-edge-detect-rf',
    system_id: 'edge-horizon',
    capability_fn: 'detect_rf',
    erp_dbm: 38,
    freq_hz: 3e9,
    data_provenance: 'training_contract_analogue',
    confidence: 'Estimated',
    caveat: 'NOT accredited propagation-engine output. Training-contract ERP analogue for exercise adjudication.',
  },
]

export const OFFLINE_ACCREDITED_DEFEAT_PK: AccreditedDefeatPkRow[] = [
  {
    id: 'acc-pk-shahed-martlet',
    platform_id: 'shahed-136',
    defeat_system_id: 'martlet-airborne-cuas',
    pd_detect_pct: 52,
    pk_rf_jamming_pct: null,
    pk_kinetic_pct: 72,
    pk_dew_pct: null,
    is_immune: false,
    immune_reason: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Assessed',
    caveat: 'NOT MoD-verified Pk. Training-contract defeat analogue for UK airborne kinetic layer exercises.',
  },
  {
    id: 'acc-pk-shahed-land-ceptor',
    platform_id: 'shahed-136',
    defeat_system_id: 'land-ceptor-cuas',
    pd_detect_pct: 54,
    pk_rf_jamming_pct: null,
    pk_kinetic_pct: 82,
    pk_dew_pct: null,
    is_immune: false,
    immune_reason: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Assessed',
    caveat: 'NOT MoD-verified Pk. Training-contract defeat analogue for Land Ceptor CAMM layer exercises.',
  },
  {
    id: 'acc-pk-shahed-edge',
    platform_id: 'shahed-136',
    defeat_system_id: 'edge-horizon',
    pd_detect_pct: 61,
    pk_rf_jamming_pct: 74,
    pk_kinetic_pct: null,
    pk_dew_pct: null,
    is_immune: false,
    immune_reason: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Reported',
    caveat: 'NOT classified Edge Group effectiveness data. Training-contract EW defeat analogue.',
  },
  {
    id: 'acc-pk-shahed-iron-dome',
    platform_id: 'shahed-136',
    defeat_system_id: 'iron-dome-tamir',
    pd_detect_pct: 68,
    pk_rf_jamming_pct: null,
    pk_kinetic_pct: 88,
    pk_dew_pct: null,
    is_immune: false,
    immune_reason: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Assessed',
    caveat: 'NOT MoD-verified Pk. Training-contract kinetic analogue for Tamir vs OWA exercises.',
  },
  {
    id: 'acc-pk-shahed-nasams',
    platform_id: 'shahed-136',
    defeat_system_id: 'nasams-amraam-er',
    pd_detect_pct: 52,
    pk_rf_jamming_pct: null,
    pk_kinetic_pct: 86,
    pk_dew_pct: null,
    is_immune: false,
    immune_reason: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Assessed',
    caveat: 'NOT MoD-verified Pk. Training-contract kinetic analogue for NASAMS AMRAAM-ER layer exercises.',
  },
  {
    id: 'acc-pk-fpv-edge-immune',
    platform_id: 'fpv-fibre-optic',
    defeat_system_id: 'edge-horizon',
    pd_detect_pct: 35,
    pk_rf_jamming_pct: 0,
    pk_kinetic_pct: null,
    pk_dew_pct: null,
    is_immune: true,
    immune_reason: 'Fibre-optic C2 — RF jamming ineffective (training analogue)',
    data_provenance: 'training_contract_analogue',
    confidence: 'Confirmed',
    caveat: 'NOT MoD-verified immunity table. Training-contract analogue for fibre-optic FPV RF immunity.',
  },
  {
    id: 'acc-pk-fpv-martlet-kinetic',
    platform_id: 'fpv-fibre-optic',
    defeat_system_id: 'martlet-airborne-cuas',
    pd_detect_pct: 48,
    pk_rf_jamming_pct: null,
    pk_kinetic_pct: 65,
    pk_dew_pct: null,
    is_immune: false,
    immune_reason: null,
    data_provenance: 'training_contract_analogue',
    confidence: 'Reported',
    caveat: 'NOT MoD-verified Pk. Training-contract kinetic-only defeat path for fibre FPV.',
  },
]

function accreditedConfidence(confidence: string): DataConfidence {
  return CONFIDENCE_MAP[confidence] ?? 'medium'
}


export function accreditedPkToEffectiveness(row: AccreditedDefeatPkRow): DefeatEffectiveness {
  return {
    id: row.id,
    platform_id: row.platform_id,
    defeat_system_id: row.defeat_system_id,
    rf_jamming_pct: row.pk_rf_jamming_pct,
    kinetic_pct: row.pk_kinetic_pct,
    dew_pct: row.pk_dew_pct,
    data_confidence: accreditedConfidence(row.confidence),
    is_immune: row.is_immune,
    immune_reason: row.immune_reason,
    swarm_engagement_pct: row.pd_detect_pct,
    weather_limited: false,
    special_notes: row.caveat,
    adjudication_rationale: row.caveat,
    modifiers: [],
    recommended_response: null,
  }
}

export function mergeAccreditedOverOsint(
  osint: DefeatEffectiveness | undefined,
  accredited: AccreditedDefeatPkRow | undefined,
): DefeatEffectiveness | undefined {
  if (!accredited) return osint
  const base = accreditedPkToEffectiveness(accredited)
  if (!osint) return base
  return {
    ...osint,
    rf_jamming_pct: accredited.pk_rf_jamming_pct ?? osint.rf_jamming_pct,
    kinetic_pct: accredited.pk_kinetic_pct ?? osint.kinetic_pct,
    dew_pct: accredited.pk_dew_pct ?? osint.dew_pct,
    swarm_engagement_pct: accredited.pd_detect_pct ?? osint.swarm_engagement_pct,
    is_immune: accredited.is_immune,
    immune_reason: accredited.immune_reason ?? osint.immune_reason,
    data_confidence: accreditedConfidence(accredited.confidence),
    special_notes: accredited.caveat,
    adjudication_rationale: accredited.caveat,
  }
}

export function resolveAccreditedErpForJam(
  systemId: string,
  capabilityFn: string,
  erpRows?: AccreditedErpProfile[],
): { erp_dbm: number; freq_hz: number; confidence: ConfidenceLevel; source: string } | null {
  const rows = erpRows ?? OFFLINE_ACCREDITED_ERP
  const row = rows.find((r) => r.system_id === systemId && r.capability_fn === capabilityFn)
  if (!row) return null
  return {
    erp_dbm: Number(row.erp_dbm),
    freq_hz: Number(row.freq_hz),
    confidence: NATO_CONFIDENCE_MAP[row.confidence] ?? 'Assessed',
    source: `training_contract_analogue — ${row.caveat}`,
  }
}
