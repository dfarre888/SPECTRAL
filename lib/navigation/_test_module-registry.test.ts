import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MODULE_GROUPS,
  SPECTRAL_MODULES,
  catalogModules,
  moduleByHref,
  sidebarGroups,
} from '@/lib/navigation/modules'

const APP_DIR = resolve(__dirname, '../../app')

/** Top-level routable modules: app/(main)/<seg>/page.tsx plus the full-bleed roots. */
function discoverRouteHrefs(): string[] {
  const hrefs: string[] = []

  const mainDir = resolve(APP_DIR, '(main)')
  for (const entry of readdirSync(mainDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    // Dynamic segments are detail views reached from their parent hub.
    if (entry.name.startsWith('[')) continue
    if (existsSync(resolve(mainDir, entry.name, 'page.tsx'))) {
      hrefs.push(`/${entry.name}`)
    }
  }

  // Full-bleed modules live outside the (main) group with their own shells.
  for (const seg of ['map', 'spectrum']) {
    if (existsSync(resolve(APP_DIR, seg, 'page.tsx'))) hrefs.push(`/${seg}`)
  }

  return hrefs.sort()
}

describe('spectral module registry', () => {
  it('is the single source of truth — every routable module is registered', () => {
    const registered = new Set(SPECTRAL_MODULES.map((m) => m.href))
    const orphans = discoverRouteHrefs().filter((href) => !registered.has(href))
    expect(orphans).toEqual([])
  })

  it('registers no module that lacks a page', () => {
    const routes = new Set(discoverRouteHrefs())
    // Nested hrefs (e.g. /operations/import) are validated against the filesystem directly.
    const dangling = SPECTRAL_MODULES.filter((m) => {
      if (routes.has(m.href)) return false
      const nested = resolve(APP_DIR, '(main)', ...m.href.split('/').filter(Boolean), 'page.tsx')
      return !existsSync(nested)
    })
    expect(dangling.map((m) => m.href)).toEqual([])
  })

  it('has no duplicate hrefs or ids', () => {
    const hrefs = SPECTRAL_MODULES.map((m) => m.href)
    const ids = SPECTRAL_MODULES.map((m) => m.id)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every module the copy both surfaces need', () => {
    for (const m of SPECTRAL_MODULES) {
      expect(m.label, `${m.id} label`).toBeTruthy()
      expect(m.sub, `${m.id} sub`).toBeTruthy()
      expect(m.blurb, `${m.id} blurb`).toBeTruthy()
      expect(m.kicker, `${m.id} kicker`).toBeTruthy()
      expect(MODULE_GROUPS.map((g) => g.id)).toContain(m.group)
    }
  })

  it('groups the sidebar so no module is unreachable', () => {
    const grouped = sidebarGroups({ operationsEdition: true }).flatMap((g) => g.modules)
    const sidebarHrefs = new Set(grouped.map((m) => m.href))
    for (const m of SPECTRAL_MODULES) {
      expect(sidebarHrefs.has(m.href), `${m.href} missing from sidebar`).toBe(true)
    }
  })

  it('hides operations-only modules outside the operations edition', () => {
    const base = sidebarGroups({ operationsEdition: false }).flatMap((g) => g.modules)
    expect(base.some((m) => m.href === '/operations/import')).toBe(false)
  })

  it('orders catalog modules by priority', () => {
    const priorities = catalogModules().map((m) => m.priority)
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b))
  })

  it('resolves the active module for nested paths', () => {
    expect(moduleByHref('/platforms/shahed-136')?.href).toBe('/platforms')
    expect(moduleByHref('/force/theatres/indo-pacific')?.href).toBe('/force')
    expect(moduleByHref('/')?.href).toBeUndefined()
  })
})
