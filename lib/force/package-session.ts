import type { ForcePackage } from '@/lib/force/types'

export const FORCE_PACKAGE_KEY = 'spectral.forcePackage'

export function writeForcePackage(pkg: ForcePackage): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(FORCE_PACKAGE_KEY, JSON.stringify(pkg))
}

export function readForcePackage(): ForcePackage | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(FORCE_PACKAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ForcePackage
    if (!parsed.theatreId || !Array.isArray(parsed.selectedIds)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearForcePackage(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(FORCE_PACKAGE_KEY)
}

export function forceMapHref(pkg: Pick<ForcePackage, 'theatreId' | 'blue' | 'red'>): string {
  const q = new URLSearchParams({
    forceTheatre: pkg.theatreId,
    blue: pkg.blue,
    red: pkg.red,
    from: 'force',
  })
  return `/map?${q.toString()}`
}
