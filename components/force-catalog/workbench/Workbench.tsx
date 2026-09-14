'use client'

/**
 * Capability workbench — the Compare tab.
 * Roster (bench platforms) · Coverage (what the package still has) ·
 * Inspector (platform / capability / talk graph), under a spectrum ribbon.
 * Bench state lives in the URL (`bench=ID,ID`) so a demo can be shared.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { analyseInteropUnderGnssDenial } from '@/lib/coalition/interop'
import { toInteropPlatforms } from '@/lib/coalition/catalog-adapter'
import { parseBench, serialiseBench } from '@/lib/force-catalog/bench-url'
import { buildCoverage, type CoverageRow, type CoverageSort } from '@/lib/force-catalog/coverage-model'
import { bandFill, sensorsStatus, type SensorsStatus } from '@/lib/force-catalog/spectrum-bands'
import { Coverage } from './Coverage'
import { Inspector, type InspectorMode } from './Inspector'
import { Roster } from './Roster'
import { SpectrumDial, type NetFill } from '@/components/force-catalog/SpectrumDial'

export function Workbench({
  platforms,
  onSelect,
  scopedFromBattle = false,
  onClearScope,
}: {
  platforms: ForceCatalogPlatformFull[]
  /** Opens the catalogue detail sheet (kept for parity with other tabs). */
  onSelect?: (p: ForceCatalogPlatformFull) => void
  scopedFromBattle?: boolean
  onClearScope?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const knownIds = useMemo(() => new Set(platforms.map((p) => p.id)), [platforms])
  const benchedList = useMemo(() => parseBench(searchParams.get('bench'), knownIds), [searchParams, knownIds])
  const benched = useMemo(() => new Set(benchedList), [benchedList])

  const setBench = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      const v = serialiseBench(ids)
      if (v) params.set('bench', v)
      else params.delete('bench')
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )
  const bench = useCallback((ids: string[]) => setBench([...new Set([...benchedList, ...ids])]), [benchedList, setBench])
  const restore = useCallback((ids: string[]) => setBench(benchedList.filter((id) => !ids.includes(id))), [benchedList, setBench])

  const [sort, setSort] = useState<CoverageSort>('coverage')
  const [focusBand, setFocusBand] = useState<string | null>(null)
  const [filterBands, setFilterBands] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<InspectorMode | null>(null)

  const coverage = useMemo(() => buildCoverage({ platforms, benched, sort }), [platforms, benched, sort])
  const denied = useMemo(
    () => analyseInteropUnderGnssDenial(toInteropPlatforms(platforms.filter((p) => !benched.has(p.id)))),
    [platforms, benched],
  )
  const sensing = useMemo(() => bandFill(platforms, benched), [platforms, benched])
  const nets: NetFill[] = useMemo(
    () => coverage.sections[0].rows.map((r) => ({ key: r.id, label: r.label, active: r.active, total: r.ghost, tier: r.tier ?? 'voice' })),
    [coverage],
  )
  const statusById = useMemo(() => {
    const out: Record<string, SensorsStatus> = {}
    for (const p of platforms) out[p.id] = sensorsStatus(p)
    return out
  }, [platforms])

  const selectPlatform = useCallback((p: ForceCatalogPlatformFull) => setMode({ type: 'platform', platform: p }), [])
  const selectRow = useCallback(
    (row: CoverageRow) => {
      if (row.kind === 'nets') setMode({ type: 'net', row })
      else {
        const ids = new Set([...row.holderIds, ...platforms.filter((p) => benched.has(p.id) && row.lostWith.includes(p.short_name)).map((p) => p.id)])
        setMode({ type: 'capability', row, holders: platforms.filter((p) => ids.has(p.id) || (row.ghost > row.active && benched.has(p.id) && rowHolds(row, p))) })
      }
    },
    [platforms, benched],
  )
  const toggleBand = useCallback((b: string) => {
    setFilterBands((prev) => {
      const next = new Set(prev)
      if (next.has(b)) next.delete(b)
      else next.add(b)
      return next
    })
  }, [])

  // Panes size to the content area, not the viewport: the sidebar eats 320px.
  const hostRef = useRef<HTMLDivElement>(null)
  const [hostW, setHostW] = useState(1200)
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setHostW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const cols = hostW >= 940 ? 3 : hostW >= 680 ? 2 : 1
  const gridCols =
    cols === 3
      ? hostW >= 1240
        ? '280px minmax(0,1fr) 360px'
        : '216px minmax(0,1fr) 300px'
      : cols === 2
        ? '240px minmax(0,1fr)'
        : 'minmax(0,1fr)'

  const selectedId = mode?.type === 'platform' ? mode.platform.id : null
  const selectedRowId = mode?.type === 'net' || mode?.type === 'capability' ? mode.row.id : null

  if (platforms.length === 0) {
    return (
      <div className="store-panel rounded-2xl p-8 text-center">
        <p className="text-[11px] font-mono store-text-muted">No platforms match the active filters.</p>
      </div>
    )
  }

  return (
    <div ref={hostRef} className="space-y-3" data-testid="capability-workbench">
      {scopedFromBattle ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 min-h-8 rounded border store-accent-border store-accent">
            Battle scope · {platforms.length}
            {onClearScope ? (
              <button type="button" onClick={onClearScope} aria-label="Clear battle drill scope" className="ml-1 inline-flex items-center justify-center h-6 w-6 rounded hover:bg-[rgba(41,151,255,0.14)]">
                <X className="h-3 w-3" aria-hidden />
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <SpectrumDial nets={nets} sensing={sensing} focusBand={focusBand} activeBands={filterBands} onHoverBand={setFocusBand} onToggleBand={toggleBand} />

      <div className="grid gap-3 items-stretch" style={{ gridTemplateColumns: gridCols, height: cols === 1 ? 'auto' : 'min(72vh, 820px)' }}>
        <Roster
          platforms={platforms}
          benched={benched}
          tierById={coverage.interop.tierByPlatform}
          statusById={statusById}
          selectedId={selectedId}
          onSelect={selectPlatform}
          onBench={bench}
          onRestore={restore}
        />
        <Coverage result={coverage} sort={sort} onSort={setSort} focusBand={focusBand} filterBands={filterBands} selectedRowId={selectedRowId} onSelectRow={selectRow} />
        <div className={`min-h-0 ${cols === 3 ? '' : mode ? 'fixed top-20 bottom-4 right-4 z-40 w-[360px] max-w-[92vw] shadow-[0_24px_64px_rgba(0,0,0,0.7)]' : 'hidden'}`}>
          <Inspector
            mode={mode}
            platforms={platforms}
            benched={benched}
            interop={coverage.interop}
            denied={denied}
            onBench={bench}
            onRestore={restore}
            onSelect={selectPlatform}
            onClose={() => setMode(null)}
          />
        </div>
      </div>
      {onSelect && mode?.type === 'platform' ? (
        <p className="text-[11px] font-mono store-text-muted">
          <button type="button" onClick={() => onSelect(mode.platform)} className="store-accent hover:underline">Open full dossier</button>
        </p>
      ) : null}
    </div>
  )
}

function rowHolds(row: CoverageRow, p: ForceCatalogPlatformFull): boolean {
  return row.lostWith.includes(p.short_name)
}
