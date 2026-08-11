import type { AustralianState } from '@/lib/iep/types'

export const STATE_DOCUMENT_TITLES: Record<AustralianState, string> = {
  NSW: 'Individual Education Plan',
  VIC: 'Personalised Learning and Support Plan',
  QLD: 'Individual Learning Plan',
  WA: 'Individual Education Plan',
  SA: 'Negotiated Education Plan',
  TAS: 'Individual Education Plan',
  ACT: 'Individual Learning Plan',
  NT: 'Individual Education Plan',
}

export const DEFAULT_DOCUMENT_TITLE = 'Individual Learning Plan'

export const AUSTRALIAN_STATES: AustralianState[] = [
  'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT',
]

export function resolveDocumentTitle(state: AustralianState): string {
  return STATE_DOCUMENT_TITLES[state] ?? DEFAULT_DOCUMENT_TITLE
}

export function stateSelectOptions(): Array<{ value: AustralianState; label: string }> {
  return AUSTRALIAN_STATES.map((s) => ({
    value: s,
    label: `${s} — ${STATE_DOCUMENT_TITLES[s]}`,
  }))
}
