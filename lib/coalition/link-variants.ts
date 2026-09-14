/**
 * Datalink variants. Same standard does not mean same net: a Link 22 fit with
 * only an HF leg cannot join a UHF-only Link 22 net without a relay. Groups are
 * OSINT (NILE programme documentation, MIDS programme office public material).
 * A bearer with no recorded variant is assumed compatible and labelled
 * "variant unknown" in the UI; we never invent a split.
 */
export interface VariantGroup {
  group: string
  label: string
  note: string
}

export const VARIANT_GROUPS: Record<string, VariantGroup> = {
  'link22/link22-hf': {
    group: 'hf',
    label: 'Link 22 HF leg',
    note: 'HF (2–30 MHz) beyond-line-of-sight leg; UHF-only terminals cannot hear it.',
  },
  'link22/link22-uhf': {
    group: 'uhf',
    label: 'Link 22 UHF leg',
    note: 'UHF (225–400 MHz) line-of-sight leg; HF-only terminals cannot hear it.',
  },
  'link16/mids-jtrs': {
    group: 'l16',
    label: 'MIDS-JTRS',
    note: 'Same J-series net as MIDS-LVT; terminal generation does not split the net.',
  },
  'link16/mids-lvt': {
    group: 'l16',
    label: 'MIDS-LVT',
    note: 'Same J-series net as MIDS-JTRS; terminal generation does not split the net.',
  },
  'link11/link11-hf': {
    group: 'hf',
    label: 'Link 11 HF',
    note: 'HF netted operation; UHF-only Link 11 terminals cannot join.',
  },
  'link11/link11-uhf': {
    group: 'uhf',
    label: 'Link 11 UHF',
    note: 'UHF netted operation; HF-only Link 11 terminals cannot join.',
  },
}

/** Net-group suffix, or null when the variant is unknown or does not split the net. */
export function variantGroup(standard: string | null, variant?: string | null): string | null {
  if (!standard || !variant) return null
  const g = VARIANT_GROUPS[`${standard}/${variant}`]
  if (!g) return null
  const groups = new Set(
    Object.entries(VARIANT_GROUPS)
      .filter(([k]) => k.startsWith(`${standard}/`))
      .map(([, v]) => v.group),
  )
  return groups.size > 1 ? g.group : null
}

export function variantLabel(standard: string | null, variant?: string | null): string {
  if (!variant) return 'variant unknown'
  return VARIANT_GROUPS[`${standard}/${variant}`]?.label ?? variant
}
