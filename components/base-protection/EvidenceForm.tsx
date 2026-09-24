'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { FileDigit, Plus, X } from 'lucide-react'
import {
  ACTIONS,
  CHECKSUM_ALGORITHMS,
  DETECTION_METHODS,
  LEGAL_NOTE,
  THREAT_LEVELS,
  buildPayload,
  type ChecksumAlgorithm,
  type EvidenceInput,
  type FieldErrors,
  type VerifiedRecord,
} from '@/lib/base-protection/evidence'
import { DEFENCE_SITES, getSite } from '@/lib/base-protection/sites'
import { formatUtc, nowLocal, zonedLocalToUtc } from '@/lib/base-protection/time'
import { INK } from '@/components/base-protection/tokens'

const SERVICES = ['RAAF', 'Navy', 'Army', 'Joint'] as const

function blankInput(siteId: string): EvidenceInput {
  const site = getSite(siteId) ?? DEFENCE_SITES[0]
  return {
    exercise: true,
    site_id: site.id,
    occurred_local: nowLocal(site.timeZone),
    detection_method: '',
    sensor: '',
    heading_deg: '',
    altitude_m_agl: '',
    drone_type: '',
    track_description: '',
    threat_level: '',
    threat_rationale: '',
    action_taken: 'observe',
    action_detail: '',
    authorising_officer_role: '',
    police_agency: site.policeAgency ?? '',
    police_reference: '',
    police_notified_local: '',
    evidence_items: [{ description: '', algorithm: 'SHA-384', checksum: '' }],
    notes: '',
  }
}

async function digestFile(file: File, algorithm: ChecksumAlgorithm): Promise<string> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest(algorithm, buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[12px] font-medium text-[var(--store-ink-soft)]">
        {label}
      </label>
      {hint ? <p className="mt-0.5 text-[11.5px] text-[var(--store-ink-mute)]">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-[12px]" style={{ color: INK.none }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

const inputCls = 'glass-field h-10 w-full px-3 text-[13px]'
const areaCls = 'glass-field w-full px-3 py-2 text-[13px] leading-relaxed'

export function EvidenceForm({
  defaultSiteId,
  amend,
  initial,
  onCancel,
  onSaved,
}: {
  defaultSiteId: string
  /** When set, the form appends a new version of this record. */
  amend?: VerifiedRecord | null
  initial?: EvidenceInput | null
  onCancel: () => void
  onSaved: (record: VerifiedRecord, storage: 'database' | 'memory') => void
}) {
  const [v, setV] = useState<EvidenceInput>(() => initial ?? blankInput(defaultSiteId))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [hashing, setHashing] = useState<number | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const site = getSite(v.site_id ?? '')
  const utc = useMemo(
    () => (site && v.occurred_local ? zonedLocalToUtc(v.occurred_local, site.timeZone) : null),
    [site, v.occurred_local],
  )
  const set = <K extends keyof EvidenceInput>(k: K, value: EvidenceInput[K]) => setV((prev) => ({ ...prev, [k]: value }))
  const err = (k: string) => errors[k]
  const described = (id: string) => (errors[id] ? `${id}-err` : undefined)

  const items = v.evidence_items ?? []
  const setItem = (i: number, patch: Partial<{ description: string; algorithm: string; checksum: string }>) =>
    set(
      'evidence_items',
      items.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    )

  async function onFile(i: number, file: File | undefined) {
    if (!file) return
    setHashing(i)
    try {
      const algorithm = (items[i]?.algorithm as ChecksumAlgorithm) ?? 'SHA-384'
      const checksum = await digestFile(file, algorithm)
      setItem(i, { checksum, description: items[i]?.description || file.name })
    } finally {
      setHashing(null)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    const local = buildPayload(v, { requireAmendmentReason: Boolean(amend) })
    if (!local.ok) {
      setErrors(local.errors)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const url = amend
        ? `/api/v1/base-protection/evidence/${encodeURIComponent(amend.record_id)}`
        : '/api/v1/base-protection/evidence'
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.fields) setErrors(json.fields)
        throw new Error(json.error ?? `Save failed (${res.status})`)
      }
      onSaved(json.data as VerifiedRecord, json.storage === 'memory' ? 'memory' : 'database')
    } catch (e2) {
      setServerError(e2 instanceof Error ? e2.message : 'Save failed')
      requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  const errorCount = Object.keys(errors).length

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" aria-labelledby="bp-form-h">
      <header className="pr-10">
        <h2 id="bp-form-h" className="store-display text-[18px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">
          {amend ? `Amend record, version ${amend.version + 1}` : 'New incident report'}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--store-ink-mute)]">
          {amend
            ? 'Version ' + amend.version + ' stays in the log unchanged. This saves a new version that points to its hash.'
            : 'Saved records cannot be edited. Corrections are saved as new versions.'}
        </p>
      </header>

      <div
        ref={summaryRef}
        tabIndex={-1}
        className={errorCount || serverError ? 'rounded-xl border px-3.5 py-2.5 text-[12.5px] outline-none' : 'sr-only'}
        style={errorCount || serverError ? { borderColor: 'rgba(255,92,110,0.45)', color: INK.none } : undefined}
        role="alert"
      >
        {serverError ?? (errorCount ? `${errorCount} field${errorCount === 1 ? '' : 's'} need attention.` : '')}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--lacquer-line)] px-3.5 py-3">
        <input
          type="checkbox"
          checked={Boolean(v.exercise)}
          onChange={(e) => set('exercise', e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--wb-blue)]"
        />
        <span>
          <span className="block text-[13px] font-medium text-[var(--store-ink)]">Exercise record</span>
          <span className="block text-[11.5px] text-[var(--store-ink-mute)]">Training use. Untick only for a real incident.</span>
        </span>
      </label>

      <fieldset className="flex flex-col gap-3.5">
        <legend className="wb-pane-title mb-2.5">When and where</legend>
        <Field id="bp-site" label="Site" error={err('site_id')}>
          <select
            id="bp-site"
            className={inputCls}
            value={v.site_id}
            aria-invalid={Boolean(err('site_id')) || undefined}
            aria-describedby={described('bp-site')}
            onChange={(e) => {
              const next = getSite(e.target.value)
              setV((prev) => ({
                ...prev,
                site_id: e.target.value,
                police_agency: prev.police_agency && prev.police_agency !== site?.policeAgency ? prev.police_agency : next?.policeAgency ?? '',
              }))
            }}
          >
            {SERVICES.map((svc) => (
              <optgroup key={svc} label={svc}>
                {DEFENCE_SITES.filter((s) => s.service === svc).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field
          id="bp-when"
          label="Local date and time at the site"
          error={err('occurred_local')}
          hint={site ? `Time zone ${site.timeZone}` : undefined}
        >
          <input
            id="bp-when"
            type="datetime-local"
            className={`${inputCls} font-mono`}
            value={v.occurred_local ?? ''}
            onChange={(e) => set('occurred_local', e.target.value)}
            aria-invalid={Boolean(err('occurred_local')) || undefined}
            aria-describedby={described('bp-when') ?? 'bp-when-utc'}
          />
          <p id="bp-when-utc" className="mt-1 font-mono text-[12px] text-[var(--store-ink-soft)]">
            {utc ? `UTC ${formatUtc(utc.utc)} (offset ${utc.offset})` : 'UTC shown once a valid time is entered'}
          </p>
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-3.5">
        <legend className="wb-pane-title mb-2.5">Detection</legend>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field id="bp-method" label="Method" error={err('detection_method')}>
            <select
              id="bp-method"
              className={inputCls}
              value={v.detection_method}
              onChange={(e) => set('detection_method', e.target.value)}
              aria-invalid={Boolean(err('detection_method')) || undefined}
              aria-describedby={described('bp-method')}
            >
              <option value="">Choose</option>
              {DETECTION_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="bp-sensor" label="Sensor or observer" error={err('sensor')}>
            <input
              id="bp-sensor"
              className={inputCls}
              value={v.sensor ?? ''}
              placeholder="e.g. Security patrol, RF detector"
              onChange={(e) => set('sensor', e.target.value)}
              aria-invalid={Boolean(err('sensor')) || undefined}
              aria-describedby={described('bp-sensor')}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3.5">
        <legend className="wb-pane-title mb-2.5">Track</legend>
        <div className="grid grid-cols-2 gap-3.5">
          <Field id="bp-heading" label="Heading, degrees" error={err('heading_deg')}>
            <input
              id="bp-heading"
              inputMode="numeric"
              className={`${inputCls} font-mono`}
              value={String(v.heading_deg ?? '')}
              placeholder="0 to 359"
              onChange={(e) => set('heading_deg', e.target.value)}
              aria-invalid={Boolean(err('heading_deg')) || undefined}
              aria-describedby={described('bp-heading')}
            />
          </Field>
          <Field id="bp-alt" label="Altitude, m AGL" error={err('altitude_m_agl')}>
            <input
              id="bp-alt"
              inputMode="numeric"
              className={`${inputCls} font-mono`}
              value={String(v.altitude_m_agl ?? '')}
              placeholder="If known"
              onChange={(e) => set('altitude_m_agl', e.target.value)}
              aria-invalid={Boolean(err('altitude_m_agl')) || undefined}
              aria-describedby={described('bp-alt')}
            />
          </Field>
        </div>
        <Field id="bp-type" label="Drone type, if known">
          <input
            id="bp-type"
            className={inputCls}
            value={v.drone_type ?? ''}
            placeholder="e.g. Small multirotor. Leave blank if not identified"
            onChange={(e) => set('drone_type', e.target.value)}
          />
        </Field>
        <Field id="bp-track" label="What was seen and where it went" error={err('track_description')}>
          <textarea
            id="bp-track"
            rows={3}
            className={areaCls}
            value={v.track_description ?? ''}
            onChange={(e) => set('track_description', e.target.value)}
            aria-invalid={Boolean(err('track_description')) || undefined}
            aria-describedby={described('bp-track')}
          />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-3.5">
        <legend className="wb-pane-title mb-2.5">Assessment and action</legend>
        <Field id="bp-threat" label="Threat assessment" error={err('threat_level')}>
          <select
            id="bp-threat"
            className={inputCls}
            value={v.threat_level}
            onChange={(e) => set('threat_level', e.target.value)}
            aria-invalid={Boolean(err('threat_level')) || undefined}
            aria-describedby={described('bp-threat')}
          >
            <option value="">Choose</option>
            {THREAT_LEVELS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="bp-rationale" label="Why" error={err('threat_rationale')}>
          <textarea
            id="bp-rationale"
            rows={2}
            className={areaCls}
            value={v.threat_rationale ?? ''}
            onChange={(e) => set('threat_rationale', e.target.value)}
            aria-invalid={Boolean(err('threat_rationale')) || undefined}
            aria-describedby={described('bp-rationale')}
          />
        </Field>
        <div>
          <span id="bp-action-l" className="block text-[12px] font-medium text-[var(--store-ink-soft)]">
            Action taken
          </span>
          <div className="seg mt-1.5" role="group" aria-labelledby="bp-action-l">
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={v.action_taken === a.id}
                onClick={() => set('action_taken', a.id)}
                className="!min-h-[36px]"
              >
                {a.label}
              </button>
            ))}
          </div>
          {err('action_taken') ? (
            <p className="mt-1 text-[12px]" style={{ color: INK.none }}>
              {err('action_taken')}
            </p>
          ) : null}
        </div>
        <Field
          id="bp-action-detail"
          label="Measure used and effect"
          hint={v.action_taken === 'disable' || v.action_taken === 'destroy' ? 'Required for disable or destroy.' : undefined}
          error={err('action_detail')}
        >
          <textarea
            id="bp-action-detail"
            rows={2}
            className={areaCls}
            value={v.action_detail ?? ''}
            onChange={(e) => set('action_detail', e.target.value)}
            aria-invalid={Boolean(err('action_detail')) || undefined}
            aria-describedby={described('bp-action-detail')}
          />
        </Field>
        <Field
          id="bp-officer"
          label="Authorising officer"
          hint="Appointment, not a name."
          error={err('authorising_officer_role')}
        >
          <input
            id="bp-officer"
            className={inputCls}
            value={v.authorising_officer_role ?? ''}
            placeholder="e.g. Duty Base Security Officer"
            onChange={(e) => set('authorising_officer_role', e.target.value)}
            aria-invalid={Boolean(err('authorising_officer_role')) || undefined}
            aria-describedby={described('bp-officer')}
          />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-3.5">
        <legend className="wb-pane-title mb-2.5">Police</legend>
        <Field id="bp-agency" label="Agency notified" error={err('police_agency')}>
          <input
            id="bp-agency"
            className={inputCls}
            value={v.police_agency ?? ''}
            onChange={(e) => set('police_agency', e.target.value)}
            aria-invalid={Boolean(err('police_agency')) || undefined}
            aria-describedby={described('bp-agency')}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field id="bp-ref" label="Police reference">
            <input
              id="bp-ref"
              className={`${inputCls} font-mono`}
              value={v.police_reference ?? ''}
              placeholder="If issued"
              onChange={(e) => set('police_reference', e.target.value)}
            />
          </Field>
          <Field id="bp-notified" label="Notified at (local)" error={err('police_notified_local')}>
            <input
              id="bp-notified"
              type="datetime-local"
              className={`${inputCls} font-mono`}
              value={v.police_notified_local ?? ''}
              onChange={(e) => set('police_notified_local', e.target.value)}
              aria-invalid={Boolean(err('police_notified_local')) || undefined}
              aria-describedby={described('bp-notified')}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="wb-pane-title mb-1">Evidence items</legend>
        <p className="-mt-1 text-[11.5px] text-[var(--store-ink-mute)]">
          Record a checksum for each file. Computing one from a file happens on this device; the file is not uploaded.
        </p>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--store-line-strong)] px-3.5 py-3 text-[12.5px] text-[var(--store-ink-soft)]">
            No evidence items. Add one for each file or exhibit.
          </p>
        ) : null}
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-[var(--lacquer-line)] p-3">
            <div className="flex items-start gap-2">
              <Field id={`bp-ev-d-${i}`} label={`Item ${i + 1}`} error={err(`evidence_items.${i}.description`)} className="flex-1">
                <input
                  id={`bp-ev-d-${i}`}
                  className={inputCls}
                  value={it.description ?? ''}
                  placeholder="e.g. Handheld video, 42 s"
                  onChange={(e) => setItem(i, { description: e.target.value })}
                  aria-invalid={Boolean(err(`evidence_items.${i}.description`)) || undefined}
                  aria-describedby={described(`bp-ev-d-${i}`)}
                />
              </Field>
              <button
                type="button"
                className="glass-icon-btn mt-6 !h-10 !w-10"
                onClick={() => set('evidence_items', items.filter((_, j) => j !== i))}
                aria-label={`Remove item ${i + 1}`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-2.5 grid grid-cols-[110px_1fr] gap-2">
              <select
                aria-label={`Checksum algorithm for item ${i + 1}`}
                className={inputCls}
                value={it.algorithm ?? 'SHA-384'}
                onChange={(e) => setItem(i, { algorithm: e.target.value, checksum: '' })}
              >
                {CHECKSUM_ALGORITHMS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <input
                id={`bp-ev-c-${i}`}
                aria-label={`Checksum for item ${i + 1}`}
                className={`${inputCls} font-mono !text-[12px]`}
                value={it.checksum ?? ''}
                placeholder="Hex digest"
                spellCheck={false}
                onChange={(e) => setItem(i, { checksum: e.target.value.trim() })}
                aria-invalid={Boolean(err(`evidence_items.${i}.checksum`)) || undefined}
                aria-describedby={described(`bp-ev-c-${i}`)}
              />
            </div>
            {err(`evidence_items.${i}.checksum`) ? (
              <p id={`bp-ev-c-${i}-err`} className="mt-1 text-[12px]" style={{ color: INK.none }}>
                {err(`evidence_items.${i}.checksum`)}
              </p>
            ) : null}
            <label className="fc-action mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[12.5px]">
              <FileDigit className="h-3.5 w-3.5" aria-hidden />
              {hashing === i ? 'Computing…' : 'Compute from a file'}
              <input type="file" className="sr-only" onChange={(e) => void onFile(i, e.target.files?.[0])} />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="fc-action inline-flex items-center gap-1.5 self-start text-[13px]"
          onClick={() => set('evidence_items', [...items, { description: '', algorithm: 'SHA-384', checksum: '' }])}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add item
        </button>
      </fieldset>

      <Field id="bp-notes" label="Notes">
        <textarea id="bp-notes" rows={2} className={areaCls} value={v.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </Field>

      {amend ? (
        <Field id="bp-reason" label="What changed and why" error={err('amendment_reason')}>
          <textarea
            id="bp-reason"
            rows={2}
            className={areaCls}
            value={v.amendment_reason ?? ''}
            onChange={(e) => set('amendment_reason', e.target.value)}
            aria-invalid={Boolean(err('amendment_reason')) || undefined}
            aria-describedby={described('bp-reason')}
          />
        </Field>
      ) : null}

      <p className="text-[11.5px] leading-relaxed text-[var(--store-ink-mute)]">{LEGAL_NOTE}</p>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center gap-2 border-t border-[var(--store-line)] bg-[var(--bp-footer-bg)] px-5 py-3">
        <button type="submit" className="btn-glass primary !min-h-[44px] !px-5" disabled={submitting}>
          {submitting ? 'Saving…' : amend ? `Save version ${amend.version + 1}` : 'Save to log'}
        </button>
        <button type="button" className="btn-glass !min-h-[44px]" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <span className="ml-auto text-[11.5px] text-[var(--store-ink-mute)]">Hashed with SHA-384 on save</span>
      </div>
    </form>
  )
}
