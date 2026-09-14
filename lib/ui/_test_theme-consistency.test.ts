import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '../..')

/**
 * components/spectrum is being rebuilt separately against its own UI model, so
 * it is out of scope for these checks by agreement rather than by oversight.
 */
const EXEMPT: string[] = []

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

function sourceFiles(): { path: string; rel: string; text: string }[] {
  return ['app', 'components', 'lib']
    .flatMap((d) => walk(join(ROOT, d)))
    .map((p) => ({ path: p, rel: relative(ROOT, p), text: readFileSync(p, 'utf8') }))
    .filter((f) => !EXEMPT.some((e) => f.rel.startsWith(e)))
    .filter((f) => !f.rel.startsWith('lib/ui/store-theme'))
}

describe('theme consistency', () => {
  const files = sourceFiles()

  it('has files to check — the walker itself must not silently pass', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('paints no surface with a pre-Dark-Frame ground colour', () => {
    // These all sat at or above the old #0A0A0F ground. Against true black they
    // render lighter than the page they are on, which is the exact seam a
    // reader notices first.
    const stale = /#0A0A0F|#0a0a0f|#080808|#0f0f10|#0F0F10|#161618|#111118/
    const offenders = files.filter((f) => stale.test(f.text)).map((f) => f.rel)
    expect(offenders).toEqual([])
  })

  it('draws borders from the token, not ad-hoc white alphas', () => {
    // A fixed alpha drifts from --store-line the moment the token changes.
    const offenders = files
      .filter((f) => /border-white\/(5|10|20)\b/.test(f.text))
      .map((f) => f.rel)
    expect(offenders).toEqual([])
  })

  it('takes text colour from the ink tokens rather than the slate ramp', () => {
    const offenders = files
      .filter((f) => /text-slate-(100|200|300|400|500)\b/.test(f.text))
      .map((f) => f.rel)
    expect(offenders).toEqual([])
  })

  it('routes 3D scene grounds through the shared constant', () => {
    // Cesium cannot read CSS custom properties, so a ground literal has to live
    // in one place or it drifts per component — which is what happened before.
    //
    // Only near-black literals are flagged. Force-side reds and blues, threat
    // markers and band hues are data, and data is allowed its colour; what is
    // not allowed is a component inventing its own ground.
    const nearBlack = (hex: string) => {
      const h = hex.replace('#', '')
      if (h.length !== 6) return false
      const lin = (c: number) => {
        const v = c / 255
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      }
      const l =
        0.2126 * lin(parseInt(h.slice(0, 2), 16)) +
        0.7152 * lin(parseInt(h.slice(2, 4), 16)) +
        0.0722 * lin(parseInt(h.slice(4, 6), 16))
      return l < 0.02
    }

    const offenders: string[] = []
    for (const f of files) {
      for (const m of f.text.matchAll(/fromCssColorString\(\s*['"](#[0-9a-fA-F]{6})['"]/g)) {
        if (nearBlack(m[1])) offenders.push(`${f.rel}: ${m[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
