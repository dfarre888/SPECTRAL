/** Bench state lives in the URL (`?bench=ID1,ID2`) so a demo state can be shared. */
export function parseBench(param: string | null, knownIds: Set<string>): string[] {
  if (!param) return []
  let decoded = param
  try {
    decoded = decodeURIComponent(param)
  } catch {
    decoded = param
  }
  const out: string[] = []
  for (const raw of decoded.split(',')) {
    const id = raw.trim()
    if (id && knownIds.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}

export function serialiseBench(ids: string[]): string | null {
  return ids.length ? ids.join(',') : null
}
