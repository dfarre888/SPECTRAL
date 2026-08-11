const TOKEN_PREFIX = '[[PII_'

export interface DeidentifyResult {
  text: string
  map: Map<string, string>
}

export function deidentify(text: string, knownValues: string[]): DeidentifyResult {
  const map = new Map<string, string>()
  let idx = 0
  let out = text

  const unique = [...new Set(knownValues.filter((v) => v && v.trim().length > 1))].sort(
    (a, b) => b.length - a.length,
  )

  for (const value of unique) {
    const token = `${TOKEN_PREFIX}${idx++}]]`
    map.set(token, value)
    out = out.split(value).join(token)
  }

  return { text: out, map }
}

export function reidentify(text: string, map: Map<string, string>): string {
  let out = text
  for (const [token, value] of map) {
    out = out.split(token).join(value)
  }
  return out
}

export function deidentifyObject<T extends Record<string, unknown>>(
  obj: T,
  knownValues: string[],
): { obj: T; map: Map<string, string> } {
  const json = JSON.stringify(obj)
  const { text, map } = deidentify(json, knownValues)
  return { obj: JSON.parse(text) as T, map }
}

export function reidentifyObject<T>(obj: T, map: Map<string, string>): T {
  const json = reidentify(JSON.stringify(obj), map)
  return JSON.parse(json) as T
}
