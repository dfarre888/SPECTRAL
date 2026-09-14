/**
 * Server-side read of the newest intel bundle shipped with the instance.
 * Bundles live in data/intel/bundles/<date>.json and travel with the deploy
 * (or are dropped in by an operator). Nothing here fetches the network.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBundle, type IntelBundle } from '@/lib/conflicts/intel-bundle'

export interface LoadedBundle {
  file: string
  bundle: IntelBundle
  attribution: string[]
}

export function loadLatestBundle(dir = join(process.cwd(), 'data', 'intel', 'bundles')): LoadedBundle | null {
  let files: string[] = []
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
  } catch {
    return null
  }
  const file = files[files.length - 1]
  if (!file) return null
  try {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as IntelBundle & { attribution?: string[] }
    const v = validateBundle(raw)
    if (!v.ok) return null
    return { file, bundle: { manifest: raw.manifest, incidents: raw.incidents }, attribution: raw.attribution ?? [] }
  } catch {
    return null
  }
}
