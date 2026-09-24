'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  LAYERS,
  assessSite,
  formatUsdShort,
  type CatalogueSystem,
  type SitePlan,
} from '@/lib/base-protection/coverage'
import type { VerifiedRecord } from '@/lib/base-protection/evidence'
import { DEFENCE_SITES, NATIONAL_SIGHTINGS_CONTEXT, publicIncidentCount, type SiteService } from '@/lib/base-protection/sites'
import { SitesTable, type SiteRow } from '@/components/base-protection/SitesTable'
import { SiteDetail } from '@/components/base-protection/SiteDetail'
import { EvidenceLog, type EvidenceLoad, type PaneMode } from '@/components/base-protection/EvidenceLog'
import { Inspector, useWide } from '@/components/base-protection/Inspector'
import { BP_THEME_CSS, INK } from '@/components/base-protection/tokens'

type View = 'sites' | 'evidence'
type ServiceFilter = 'all' | SiteService
type Storage = 'database' | 'memory'

const SERVICE_FILTERS: { id: ServiceFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'RAAF', label: 'RAAF' },
  { id: 'Navy', label: 'Navy' },
  { id: 'Army', label: 'Army' },
  { id: 'Joint', label: 'Joint' },
]

export interface BaseProtectionProps {
  systems: CatalogueSystem[]
  catalogueSource: 'database' | 'offline'
  initialPlans: SitePlan[]
  plansStorage: Storage
  plansError: string | null
  initialEvidence: VerifiedRecord[]
  evidenceStorage: Storage
  evidenceError: string | null
  initialView: View
  initialSiteId: string | null
}

function StorageTag({ what }: { what: string }) {
  return (
    <span
      className="tag amber"
      title={`${what} storage is not available on this database yet (table missing or access rejected). Changes are kept for this server session only and are lost on restart.`}
    >
      Not saved: storage unavailable
    </span>
  )
}

export function BaseProtectionClient(props: BaseProtectionProps) {
  const { systems } = props
  const catalogue = useMemo(() => new Map(systems.map((s) => [s.id, s])), [systems])

  const [view, setView] = useState<View>(props.initialView)
  const [service, setService] = useState<ServiceFilter>('all')
  const [plans, setPlans] = useState<Map<string, SitePlan>>(() => new Map(props.initialPlans.map((p) => [p.siteId, p])))
  const [plansStorage, setPlansStorage] = useState<Storage>(props.plansStorage)
  const validInitial = props.initialSiteId && DEFENCE_SITES.some((s) => s.id === props.initialSiteId) ? props.initialSiteId : null
  const [selectedId, setSelectedId] = useState<string>(validInitial ?? DEFENCE_SITES[0].id)
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(Boolean(validInitial))
  const wide = useWide()

  const [evidence, setEvidence] = useState<EvidenceLoad>(() =>
    props.evidenceError
      ? { kind: 'error', message: props.evidenceError }
      : { kind: 'ready', records: props.initialEvidence, storage: props.evidenceStorage },
  )
  const [logSite, setLogSite] = useState<string>('all')
  const [pane, setPane] = useState<PaneMode>({ kind: 'none' })

  const reloadEvidence = useCallback(async () => {
    setEvidence({ kind: 'loading' })
    try {
      const res = await fetch('/api/v1/base-protection/evidence', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
      setEvidence({ kind: 'ready', records: json.data as VerifiedRecord[], storage: json.storage === 'memory' ? 'memory' : 'database' })
    } catch (e) {
      setEvidence({ kind: 'error', message: e instanceof Error ? e.message : 'Request failed' })
    }
  }, [])

  const records = evidence.kind === 'ready' ? evidence.records : []
  const logBySite = useMemo(() => {
    const m = new Map<string, { all: number; exercise: number }>()
    for (const r of records) {
      const c = m.get(r.site_id) ?? { all: 0, exercise: 0 }
      c.all++
      if (r.is_exercise) c.exercise++
      m.set(r.site_id, c)
    }
    return m
  }, [records])

  const allRows: SiteRow[] = useMemo(
    () =>
      DEFENCE_SITES.map((site) => {
        const plan = plans.get(site.id) ?? null
        const a = assessSite(site, plan, catalogue)
        const packageLabel = a.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')
        return { site, a, logCount: logBySite.get(site.id)?.all ?? 0, packageLabel }
      }),
    [plans, catalogue, logBySite],
  )
  const rows = useMemo(() => (service === 'all' ? allRows : allRows.filter((r) => r.site.service === service)), [allRows, service])

  const inst = useMemo(() => {
    const planned = allRows.filter((r) => r.a.hasPackage).length
    const incidents = DEFENCE_SITES.reduce((n, s) => n + publicIncidentCount(s), 0)
    const incidentSites = DEFENCE_SITES.filter((s) => publicIncidentCount(s) > 0).length
    const uncovered = allRows.reduce((n, r) => n + r.a.uncovered.length, 0)
    const total = allRows.length * LAYERS.length
    let cost = 0
    let unpriced = 0
    for (const r of allRows) {
      cost += r.a.cost.totalUsd
      unpriced += r.a.cost.unpricedUnits
    }
    return { planned, incidents, incidentSites, uncovered, total, cost, unpriced }
  }, [allRows])

  const selected = allRows.find((r) => r.site.id === selectedId) ?? allRows[0]

  const onPlanSaved = useCallback((plan: SitePlan, storage: Storage) => {
    setPlans((prev) => {
      const next = new Map(prev)
      if (plan.items.length === 0 && plan.radiusM == null) next.delete(plan.siteId)
      else next.set(plan.siteId, plan)
      return next
    })
    setPlansStorage(storage)
  }, [])

  const onEvidenceSaved = useCallback((rec: VerifiedRecord, storage: Storage) => {
    setEvidence((prev) => {
      const list = prev.kind === 'ready' ? prev.records.filter((r) => r.record_id !== rec.record_id) : []
      return { kind: 'ready', records: [rec, ...list], storage }
    })
  }, [])

  const openLog = useCallback(
    (siteId: string) => {
      setLogSite(siteId)
      setView('evidence')
      const count = logBySite.get(siteId)?.all ?? 0
      setPane(count ? { kind: 'none' } : { kind: 'new', siteId })
      setInspectorOpen(false)
    },
    [logBySite],
  )

  const siteDetail = selected ? (
    <SiteDetail
      key={selected.site.id}
      site={selected.site}
      plan={plans.get(selected.site.id) ?? null}
      systems={systems}
      catalogue={catalogue}
      logCount={logBySite.get(selected.site.id)?.all ?? 0}
      exerciseLogCount={logBySite.get(selected.site.id)?.exercise ?? 0}
      onSaved={onPlanSaved}
      onOpenLog={openLog}
    />
  ) : null

  return (
    <div className="bp-root mt-6">
      <style dangerouslySetInnerHTML={{ __html: BP_THEME_CSS }} />
      <div className="fc-inst border-y fc-hair" aria-label="Base protection instruments">
        <div>
          <div className="k">Sites</div>
          <div className="v">{DEFENCE_SITES.length}</div>
          <div className="d">{DEFENCE_SITES.filter((s) => s.country === 'Australia').length} in Australia, 1 deployed</div>
        </div>
        <div>
          <div className="k">With a planned package</div>
          <div className="v">
            {inst.planned}
            <small>/{DEFENCE_SITES.length}</small>
          </div>
          <div className="d">planning input, not what is fielded</div>
        </div>
        <div>
          <div className="k">Incidents on public record</div>
          <div className="v">{inst.incidents}</div>
          <div className="d" title={`${NATIONAL_SIGHTINGS_CONTEXT.summary} Source: ${NATIONAL_SIGHTINGS_CONTEXT.sources[0].label}.`}>
            at {inst.incidentSites} sites. About {NATIONAL_SIGHTINGS_CONTEXT.approxCount} Defence sightings in {NATIONAL_SIGHTINGS_CONTEXT.period} (reported)
          </div>
        </div>
        <div>
          <div className="k">Layers uncovered in the plan</div>
          <div className="v">
            {inst.uncovered}
            <small>/{inst.total}</small>
          </div>
          <div className="d">
            {inst.planned === 0
              ? 'no site has a planned package yet'
              : `detect, track, defeat; ${DEFENCE_SITES.length - inst.planned} sites not planned`}
          </div>
        </div>
        <div>
          <div className="k">Cost of planned packages</div>
          <div className="v">{inst.planned === 0 ? <span className="text-[var(--store-ink-mute)]">None</span> : inst.cost ? formatUsdShort(inst.cost) : 'No public cost'}</div>
          <div className="d">
            {inst.planned === 0 ? 'assign packages to see cost' : inst.unpriced ? `plus ${inst.unpriced} units with no public cost` : 'catalogue prices, US$'}
          </div>
        </div>
      </div>

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-3">
        <div className="seg" role="tablist" aria-label="Base protection views">
          <button type="button" role="tab" id="bp-tab-sites" aria-controls="bp-panel" aria-selected={view === 'sites'} onClick={() => setView('sites')}>
            Sites <span className="font-mono tabular-nums opacity-70">{DEFENCE_SITES.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="bp-tab-evidence"
            aria-controls="bp-panel"
            aria-selected={view === 'evidence'}
            onClick={() => setView('evidence')}
          >
            Evidence log <span className="font-mono tabular-nums opacity-70">{records.length}</span>
          </button>
        </div>
        {view === 'sites' ? (
          <>
            <div className="seg sm" role="group" aria-label="Filter by service">
              {SERVICE_FILTERS.map((f) => (
                <button key={f.id} type="button" aria-pressed={service === f.id} onClick={() => setService(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            {wide === false && !inspectorOpen ? (
              <span className="text-[12px] text-[var(--store-ink-mute)]">Select a site to plan its package</span>
            ) : null}
          </>
        ) : null}
        <div className="flex items-center gap-2">
          {view === 'sites' && plansStorage === 'memory' ? <StorageTag what="Package plan" /> : null}
          {view === 'evidence' && evidence.kind === 'ready' && evidence.storage === 'memory' ? <StorageTag what="Evidence log" /> : null}
          {props.catalogueSource === 'offline' ? (
            <span className="tag amber" title="The anti_drone_systems table did not load; a reduced offline list is in use.">
              Offline catalogue
            </span>
          ) : null}
        </div>
      </div>

      <div id="bp-panel" role="tabpanel" aria-labelledby={view === 'sites' ? 'bp-tab-sites' : 'bp-tab-evidence'}>
        {view === 'sites' ? (
          <>
            {props.plansError ? (
              <p className="mb-3 text-[12.5px]" style={{ color: INK.partial }} role="status">
                Saved packages did not load ({props.plansError}). Showing every site as none assigned.
              </p>
            ) : null}
            <div className={wide !== false ? 'grid gap-5 min-[1680px]:grid-cols-[minmax(0,1fr)_420px]' : ''}>
              <div className="min-w-0">
                <SitesTable
                  rows={rows}
                  selectedId={wide || inspectorOpen ? selected?.site.id ?? null : null}
                  onSelect={(id) => {
                    setSelectedId(id)
                    setInspectorOpen(true)
                  }}
                />
                <p className="mt-3 max-w-[110ch] text-[11.5px] leading-relaxed text-[var(--store-ink-mute)]">
                  Coverage is the share of each site’s protection circle inside a planned system’s published range. Sensors and
                  integrated systems count for detect and track (the catalogue does not yet separate detect-only sensors); every
                  other system counts for defeat. Systems without a published range are listed but not counted. Radii are planning
                  assumptions. Public reporting lists only what has been published; “No public reporting” says nothing about what is
                  fielded.
                </p>
              </div>
              {selected && wide !== false ? (
                <aside
                  className="store-panel hidden self-start rounded-2xl min-[1680px]:sticky min-[1680px]:top-0 min-[1680px]:block min-[1680px]:max-h-[calc(100vh-88px)] min-[1680px]:overflow-y-auto"
                  aria-label={`${selected.site.name} detail`}
                >
                  <div className="p-5">{siteDetail}</div>
                </aside>
              ) : null}
            </div>
            {selected && wide === false ? (
              <Inspector
                open={inspectorOpen}
                onClose={() => setInspectorOpen(false)}
                label={`${selected.site.name} detail`}
                focusKey={selected.site.id}
              >
                {siteDetail}
              </Inspector>
            ) : null}
          </>
        ) : (
          <EvidenceLog
            load={evidence}
            onReload={() => void reloadEvidence()}
            siteFilter={logSite}
            onSiteFilter={setLogSite}
            pane={pane}
            onPane={setPane}
            onSaved={onEvidenceSaved}
            wide={wide}
          />
        )}
      </div>
    </div>
  )
}
