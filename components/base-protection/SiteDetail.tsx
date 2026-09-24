'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ExternalLink, Map as MapIcon } from 'lucide-react'
import {
  LAYERS,
  LAYER_LABEL,
  assessSite,
  costLabel,
  formatPct,
  formatRangeM,
  layerState,
  normaliseItems,
  type CatalogueSystem,
  type PackageItem,
  type SitePlan,
} from '@/lib/base-protection/coverage'
import { KIND_LABEL, type DefenceSite } from '@/lib/base-protection/sites'
import { PlanView } from '@/components/base-protection/PlanView'
import { PackageEditor } from '@/components/base-protection/PackageEditor'
import { STATE_INK } from '@/components/base-protection/tokens'

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; storage: 'database' | 'memory' } | { kind: 'error'; message: string }

function sameItems(a: PackageItem[], b: PackageItem[]) {
  const na = normaliseItems(a)
  const nb = normaliseItems(b)
  return na.length === nb.length && na.every((x, i) => x.systemId === nb[i].systemId && x.qty === nb[i].qty)
}

function formatDate(d: string) {
  if (d.length === 7) {
    const [y, m] = d.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function SiteDetail({
  site,
  plan,
  systems,
  catalogue,
  logCount,
  exerciseLogCount,
  onSaved,
  onOpenLog,
}: {
  site: DefenceSite
  plan: SitePlan | null
  systems: CatalogueSystem[]
  catalogue: ReadonlyMap<string, CatalogueSystem>
  logCount: number
  exerciseLogCount: number
  onSaved: (plan: SitePlan, storage: 'database' | 'memory') => void
  onOpenLog: (siteId: string) => void
}) {
  const savedItems = plan?.items ?? []
  const savedRadiusKm = plan?.radiusM ? String(plan.radiusM / 1000) : ''
  const [items, setItems] = useState<PackageItem[]>(savedItems)
  const [radiusKm, setRadiusKm] = useState(savedRadiusKm)
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })

  const radiusM = radiusKm.trim() === '' ? null : Math.round(Number(radiusKm) * 1000)
  const radiusInvalid = radiusM != null && (!Number.isFinite(radiusM) || radiusM < 100 || radiusM > 100_000)
  const draftPlan = { items, radiusM: radiusInvalid ? null : radiusM }
  const assessment = useMemo(() => assessSite(site, draftPlan, catalogue), [site, items, radiusM, radiusInvalid, catalogue]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !sameItems(items, savedItems) || radiusKm.trim() !== savedRadiusKm

  async function persist(nextItems: PackageItem[], nextRadiusM: number | null) {
    setSave({ kind: 'saving' })
    try {
      const res = await fetch(`/api/v1/base-protection/plans/${encodeURIComponent(site.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: normaliseItems(nextItems), radiusM: nextRadiusM }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? `Save failed (${res.status})`)
      const storage = json.storage === 'memory' ? 'memory' : 'database'
      onSaved(json.data as SitePlan, storage)
      setSave({ kind: 'saved', storage })
    } catch (e) {
      setSave({ kind: 'error', message: e instanceof Error ? e.message : 'Save failed' })
    }
  }

  const coords = `${Math.abs(site.lat).toFixed(3)}°${site.lat < 0 ? 'S' : 'N'} ${site.lon.toFixed(3)}°E`

  return (
    <div className="flex flex-col gap-5">
      <header className="pr-10">
        <h2 className="store-display text-[18px] font-semibold leading-tight tracking-[-0.01em] text-[var(--store-ink)]">{site.name}</h2>
        <p className="mt-1 text-[12px] text-[var(--store-ink-mute)]">
          {site.service} · {KIND_LABEL[site.kind]} · {site.region} · <span className="font-mono">{coords}</span>
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--store-ink-soft)]">{site.role}</p>
      </header>

      <section aria-labelledby="bp-cov-h">
        <h3 id="bp-cov-h" className="sr-only">
          Coverage
        </h3>
        <div className="grid grid-cols-3 border-y border-[var(--store-line)]">
          {LAYERS.map((l, i) => {
            const lc = assessment.layers[l]
            const st = layerState(lc.fraction)
            return (
              <div key={l} className={`py-3 ${i ? 'pl-4 border-l border-[var(--store-line)]' : ''}`}>
                <div className="text-[11.5px] text-[var(--store-ink-mute)]">{LAYER_LABEL[l]}</div>
                <div
                  className="mt-1 font-mono text-[22px] font-medium leading-none tabular-nums"
                  style={{ color: assessment.hasPackage ? STATE_INK[st] : 'var(--store-ink-mute)' }}
                >
                  {assessment.hasPackage ? formatPct(lc.fraction) : '–'}
                </div>
                <div className="mt-1.5 text-[11.5px] text-[var(--store-ink-mute)] font-mono">
                  {!assessment.hasPackage ? 'not planned' : lc.reachM != null ? `reach ${formatRangeM(lc.reachM)}` : 'no reach'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <PlanView assessment={assessment} siteName={site.name} />

      <section aria-labelledby="bp-radius-h">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <label id="bp-radius-h" htmlFor="bp-radius" className="text-[12px] font-medium text-[var(--store-ink-soft)]">
              Protection radius, km
            </label>
            <p className="mt-0.5 text-[11.5px] text-[var(--store-ink-mute)]">
              Planning assumption. Default {formatRangeM(site.nominalRadiusM)} for {KIND_LABEL[site.kind].toLowerCase()}s.
            </p>
          </div>
          <input
            id="bp-radius"
            inputMode="decimal"
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
            placeholder={String(site.nominalRadiusM / 1000)}
            aria-invalid={radiusInvalid || undefined}
            aria-describedby={radiusInvalid ? 'bp-radius-err' : undefined}
            className="glass-field h-9 w-24 px-3 text-right font-mono text-[13px]"
          />
        </div>
        {radiusInvalid ? (
          <p id="bp-radius-err" className="mt-1 text-[12px]" style={{ color: STATE_INK.none }}>
            Use 0.1 to 100 km, or clear it for the default.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="bp-pkg-h">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 id="bp-pkg-h" className="wb-pane-title">
            Planned package
          </h3>
          <span className="text-[11.5px] text-[var(--store-ink-mute)]">Planning only, not what is fielded</span>
        </div>
        <PackageEditor items={items} assessed={assessment.items} systems={systems} onChange={setItems} />

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
          <dt className="text-[var(--store-ink-mute)]">Gap</dt>
          <dd className="text-right">
            {!assessment.hasPackage ? (
              <span className="text-[var(--store-ink-mute)]">Not planned</span>
            ) : assessment.uncovered.length === 0 ? (
              <span style={{ color: STATE_INK.full }}>None</span>
            ) : (
              assessment.uncovered.map((l, i) => (
                <span key={l} style={{ color: STATE_INK[layerState(assessment.layers[l].fraction)] }}>
                  {i ? ', ' : ''}
                  {LAYER_LABEL[l]}
                  {layerState(assessment.layers[l].fraction) === 'partial' ? ` ${formatPct(assessment.layers[l].fraction)}` : ''}
                </span>
              ))
            )}
          </dd>
          <dt className="text-[var(--store-ink-mute)]">Cost to close</dt>
          <dd className="text-right font-mono text-[var(--store-ink)]">{costLabel(assessment.cost)}</dd>
        </dl>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--store-ink-mute)]">
          Catalogue unit prices in US dollars where published. Ranges are published maximums against each system’s design target;
          small drones are harder to see and hit, so read coverage as an upper bound.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-glass primary !min-h-[44px] !px-5"
            disabled={!dirty || radiusInvalid || save.kind === 'saving'}
            onClick={() => void persist(items, radiusM)}
          >
            {save.kind === 'saving' ? 'Saving…' : 'Save package'}
          </button>
          {dirty ? (
            <button
              type="button"
              className="btn-glass !min-h-[44px]"
              onClick={() => {
                setItems(savedItems)
                setRadiusKm(savedRadiusKm)
                setSave({ kind: 'idle' })
              }}
            >
              Discard changes
            </button>
          ) : plan && (plan.items.length > 0 || plan.radiusM != null) ? (
            <button
              type="button"
              className="btn-glass !min-h-[44px]"
              disabled={save.kind === 'saving'}
              onClick={() => {
                setItems([])
                setRadiusKm('')
                void persist([], null)
              }}
            >
              Clear package
            </button>
          ) : null}
          <span className="text-[12px] text-[var(--store-ink-mute)]" role="status" aria-live="polite">
            {save.kind === 'error' ? (
              <span style={{ color: STATE_INK.none }}>{save.message}</span>
            ) : dirty ? (
              'Unsaved changes'
            ) : save.kind === 'saved' ? (
              save.storage === 'memory' ? 'Saved for this session only' : 'Saved'
            ) : null}
          </span>
        </div>
      </section>

      <section aria-labelledby="bp-pub-h">
        <h3 id="bp-pub-h" className="wb-pane-title mb-2">
          Public reporting
        </h3>
        {site.publicReporting.length === 0 ? (
          <p className="text-[13px] text-[var(--store-ink-soft)]">No public reporting.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {site.publicReporting.map((r, i) => (
              <li key={i} className="text-[13px] leading-relaxed">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`tag ${r.kind === 'cuas' ? 'blue' : 'amber'}`}>{r.kind === 'cuas' ? 'C-UAS' : 'Incident'}</span>
                  <span className="font-mono text-[12px] text-[var(--store-ink-soft)]">{formatDate(r.date)}</span>
                  <span className="text-[11.5px] text-[var(--store-ink-mute)]">{r.basis === 'official' ? 'Confirmed by officials' : 'Reported'}</span>
                </div>
                <p className="mt-1 text-[var(--store-ink-soft)]">{r.summary}</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {r.sources.map((s) =>
                    s.url ? (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1 text-[12px] text-[var(--wb-blue)] underline-offset-2 hover:underline"
                        >
                          <span>{s.label}</span>
                          <ExternalLink className="mt-[3px] h-3 w-3 shrink-0" aria-hidden />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      </li>
                    ) : (
                      <li key={s.label} className="text-[12px] text-[var(--store-ink-mute)]">
                        {s.label}
                      </li>
                    ),
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="bp-log-h" className="border-t border-[var(--store-line)] pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id="bp-log-h" className="wb-pane-title">
              Evidence log
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--store-ink-mute)]">
              {logCount === 0
                ? 'No records for this site.'
                : `${logCount} record${logCount === 1 ? '' : 's'}${exerciseLogCount ? `, ${exerciseLogCount === logCount ? 'all' : exerciseLogCount} exercise` : ''}`}
            </p>
          </div>
          <button type="button" className="fc-action text-[13px]" onClick={() => onOpenLog(site.id)}>
            {logCount ? 'View records' : 'Log an incident'}
          </button>
        </div>
      </section>

      <Link href={`/map?lat=${site.lat}&lon=${site.lon}&h=9000`} className="btn-glass !min-h-[44px] w-full">
        <MapIcon className="h-4 w-4" aria-hidden />
        Open on Map Intel
      </Link>
    </div>
  )
}
