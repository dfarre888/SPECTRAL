import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TELEMETRY_SIGNATURES } from '@/lib/trust/telemetry-check'

/**
 * The Trust page states that SPECTRAL ships no third-party analytics or
 * telemetry. This test keeps that sentence true.
 */
const ROOT = process.cwd()
const SCAN_DIRS = ['app', 'components', 'lib', 'public', 'middleware.ts', 'next.config.mjs']
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs|html|css)$/
const SKIP = new Set([join('lib', 'trust', 'telemetry-check.ts'), join('lib', 'trust', '_test_no-telemetry.test.ts')])

function walk(p: string, out: string[]) {
  let st
  try {
    st = statSync(p)
  } catch {
    return
  }
  if (st.isDirectory()) {
    const base = p.split('/').pop()
    if (base === 'node_modules' || base === 'cesium' || base === '.next') return
    for (const f of readdirSync(p)) walk(join(p, f), out)
  } else if (EXT.test(p) && st.size < 2_000_000) {
    out.push(p)
  }
}

describe('no third-party telemetry', () => {
  it('declares no analytics or telemetry packages', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as Record<string, Record<string, string>>
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join('\n').toLowerCase()
    const hits = TELEMETRY_SIGNATURES.flatMap((s) => s.needles.filter((n) => deps.includes(n.toLowerCase())).map((n) => `${s.service}: ${n}`))
    expect(hits).toEqual([])
  })

  it('references no analytics or telemetry services in app, components, lib or public', () => {
    const files: string[] = []
    for (const d of SCAN_DIRS) walk(join(ROOT, d), files)
    expect(files.length).toBeGreaterThan(100)
    const hits: string[] = []
    for (const f of files) {
      const rel = relative(ROOT, f)
      if (SKIP.has(rel)) continue
      const text = readFileSync(f, 'utf8').toLowerCase()
      for (const s of TELEMETRY_SIGNATURES) for (const n of s.needles) if (text.includes(n.toLowerCase())) hits.push(`${rel}: ${n}`)
    }
    expect(hits).toEqual([])
  })
})
