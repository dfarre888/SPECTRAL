/**
 * Commander-facing catalog labels.
 * Industrial / GRAU / AN designators go second. The name a staff officer
 * actually uses (NATO reporting name or parent system) goes first.
 */

export interface CatalogNameParts {
  name: string
  natoName?: string | null
  parentSystem?: string | null
}

export function stripSaSuffix(label: string): string {
  return label.replace(/\s*\([^)]*\)/g, '').trim()
}

/** GRAU / industrial index or US AN/ nomenclature — not a spoken system name. */
export function looksLikeIndustrialDesignator(token: string): boolean {
  const t = token.trim()
  if (!t) return false
  if (/^AN\//i.test(t)) return true
  if (/\s/.test(t)) return false
  return /^[0-9]/.test(t) && /[A-Za-z]/.test(t)
}

function firstDesignatorToken(raw: string): { designator: string; rest: string } | null {
  const an = raw.match(/^(AN\/[A-Z]{2,}(?:-[A-Z0-9()\/]+)*)\s*(.*)$/i)
  if (an) {
    return { designator: an[1], rest: an[2].trim() }
  }
  const grau = raw.match(/^([0-9][A-Za-z0-9()\/-]*)\s+(.*)$/)
  if (grau && looksLikeIndustrialDesignator(grau[1])) {
    return { designator: grau[1], rest: grau[2].trim() }
  }
  return null
}

export function splitCatalogName(raw: string): { designator: string | null; embeddedName: string | null } {
  const trimmed = raw.trim()
  const trailing = trimmed.match(/^(.+?)\s+\(([^)]+)\)\s*$/)
  if (trailing) {
    const head = trailing[1].trim()
    const inner = trailing[2].trim()
    if (looksLikeIndustrialDesignator(head)) {
      return { designator: head, embeddedName: inner }
    }
    if (looksLikeIndustrialDesignator(inner) && !looksLikeIndustrialDesignator(head)) {
      return { designator: inner, embeddedName: head }
    }
  }

  const split = firstDesignatorToken(trimmed)
  if (split) {
    const rest = split.rest.replace(/^\((.+)\)$/, '$1').trim()
    return { designator: split.designator, embeddedName: rest || null }
  }

  if (looksLikeIndustrialDesignator(trimmed)) {
    return { designator: trimmed, embeddedName: null }
  }

  return { designator: null, embeddedName: trimmed }
}

function pickFriendlyName(
  parts: CatalogNameParts,
  parsed: { designator: string | null; embeddedName: string | null },
): string | null {
  const nato = parts.natoName?.trim() || null
  if (nato && nato !== parsed.designator) return nato

  const parent = parts.parentSystem?.trim() ? stripSaSuffix(parts.parentSystem) : null
  if (parent && parent !== parsed.designator) return parent

  const embedded = parsed.embeddedName?.trim() || null
  if (embedded && !looksLikeIndustrialDesignator(embedded)) return embedded
  if (embedded) return embedded
  return null
}

/** Name first, alphanumeric designator second. */
export function formatCatalogDisplayName(parts: CatalogNameParts): string {
  const raw = parts.name.trim()
  if (!raw) return parts.natoName?.trim() || parts.parentSystem?.trim() || raw

  const parsed = splitCatalogName(raw)
  const friendly = pickFriendlyName(parts, parsed)
  const designator = parsed.designator

  if (friendly && designator) {
    if (friendly.toLowerCase().includes(designator.toLowerCase())) return friendly
    return `${friendly} (${designator})`
  }
  if (friendly) return friendly
  return raw
}

export function formatRadarDisplayName(asset: {
  name: string
  nato_name?: string | null
  associated_system?: string | null
}): string {
  return formatCatalogDisplayName({
    name: asset.name,
    natoName: asset.nato_name,
    parentSystem: asset.associated_system,
  })
}

export function formatEffectorDisplayName(asset: {
  name: string
  nato_name?: string | null
  associated_system?: string | null
}): string {
  return formatCatalogDisplayName({
    name: asset.name,
    natoName: asset.nato_name,
    parentSystem: asset.associated_system,
  })
}
