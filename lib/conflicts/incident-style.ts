import type { ConflictIncidentType } from '@/lib/conflicts/types'

export const INCIDENT_TYPE_COLOR: Record<ConflictIncidentType, string> = {
  uas_strike: '#F97316',
  gnss_denial: '#06B6D4',
  ew: '#A78BFA',
  naval: '#38BDF8',
  isr: '#4ADE80',
  swarm: '#FB7185',
  cruise_strike: '#EAB308',
  ballistic_strike: '#F43F5E',
  intercept: '#22D3EE',
  strike: '#FB923C',
  other: '#94A3B8',
}

export const INCIDENT_TYPE_LABEL: Record<ConflictIncidentType, string> = {
  uas_strike: 'UAS strike',
  gnss_denial: 'GNSS denial',
  ew: 'EW',
  naval: 'Naval',
  isr: 'ISR',
  swarm: 'Swarm',
  cruise_strike: 'Cruise strike',
  ballistic_strike: 'Ballistic',
  intercept: 'Intercept',
  strike: 'Strike',
  other: 'Other',
}

export function normalizeIncidentType(value: string): ConflictIncidentType {
  if (value in INCIDENT_TYPE_COLOR) return value as ConflictIncidentType
  return 'other'
}
