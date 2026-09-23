'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, FileUp, Grid3X3, Upload } from 'lucide-react'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StorePanel } from '@/components/ui/store-surface'
import type { ImportJob } from '@/lib/operations/import'
import type { CatalogueDataGap } from '@/lib/operations/tenant-performance'

const CONFIDENCE_OPTIONS = ['Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected'] as const

type FormId = 'platform' | 'defeat' | 'document'
type Notice = { form: FormId; ok: boolean; text: string }

const JOB_TYPE_LABEL: Record<ImportJob['job_type'], string> = {
  platform: 'Platform',
  document: 'Document',
  buildings: 'Buildings',
  defeat_matrix: 'Defeat matrix',
}

const JOB_STATUS_TONE: Record<ImportJob['status'], string> = {
  queued: 'blue',
  processing: 'amber',
  completed: 'green',
  failed: 'red',
}

function jobLabel(job: ImportJob): string {
  if (job.job_type === 'defeat_matrix') {
    const platform = job.payload.platform_id as string | undefined
    const system = job.payload.defeat_system_id as string | undefined
    if (platform && system) return `${platform} × ${system}`
  }
  return (
    (job.payload.name as string) ??
    (job.payload.title as string) ??
    job.id.slice(0, 8)
  )
}

function resolutionHint(path: CatalogueDataGap['resolution_path']): string {
  if (path === 'tenant_platform_extensions') {
    return 'Add a proprietary platform stub with the platform import form.'
  }
  if (path === 'accredited_resolver') {
    return 'Requires the accredited propagation resolver under contract. Contact Spectral Operations support.'
  }
  return 'Submit tenant Pd/Pk with the defeat matrix form.'
}

const GAP_COLUMNS: DataColumn<CatalogueDataGap>[] = [
  {
    key: 'gap',
    header: 'Gap',
    width: 260,
    cell: (g) => (
      <>
        <span className="primary">{g.label}</span>
        {g.related_system_id || g.related_platform_id ? (
          <span className="meta font-mono">{g.related_system_id ?? g.related_platform_id}</span>
        ) : null}
      </>
    ),
    sortValue: (g) => g.label,
  },
  {
    key: 'status',
    header: 'Status',
    width: 150,
    cell: (g) =>
      g.resolved ? (
        <>
          <span className="tag amber">Analogue fill</span>
          {g.supplement_count ? <span className="meta">{g.supplement_count} supplements</span> : null}
        </>
      ) : (
        <span className="tag">Open</span>
      ),
    sortValue: (g) => (g.resolved ? 1 : 0),
  },
  { key: 'reason', header: 'Reason', cell: (g) => <span className="leading-relaxed">{g.reason}</span> },
  {
    key: 'resolution',
    header: 'Resolution',
    cell: (g) => (
      <>
        <span className="leading-relaxed text-[var(--store-ink-soft)]">{resolutionHint(g.resolution_path)}</span>
        {g.caveat ? <span className="meta leading-relaxed">{g.caveat}</span> : null}
      </>
    ),
  },
]

function Field({ id, label, hint, children }: { id: string; label: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium store-text-body">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[12px] store-text-muted">{hint}</p> : null}
    </div>
  )
}

function FormPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <StorePanel className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[var(--lacquer-line)] bg-white/[0.04]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">{title}</h2>
          <p className="mt-0.5 text-[13px] store-text-body">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </StorePanel>
  )
}

const FIELD = 'glass-field h-10 w-full px-3 text-[13px]'
const SUBMIT = 'btn-glass primary disabled:cursor-not-allowed disabled:opacity-40'

export default function OperationsImportPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [gaps, setGaps] = useState<CatalogueDataGap[]>([])
  const [platformName, setPlatformName] = useState('')
  const [defeatPlatformId, setDefeatPlatformId] = useState('')
  const [defeatSystemId, setDefeatSystemId] = useState('')
  const [pdDetect, setPdDetect] = useState('')
  const [rfPct, setRfPct] = useState('')
  const [kineticPct, setKineticPct] = useState('')
  const [dewPct, setDewPct] = useState('')
  const [confidence, setConfidence] = useState<(typeof CONFIDENCE_OPTIONS)[number]>('Reported')
  const [defeatNotes, setDefeatNotes] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(true)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    const [jobsRes, gapsRes] = await Promise.all([
      fetch('/api/v1/import-jobs'),
      fetch('/api/v1/catalogue-data-gaps'),
    ])

    if (jobsRes.status === 403) {
      setAccessError('Operations edition required for tenant import')
      setJobs([])
    } else if (jobsRes.ok) {
      const json = await jobsRes.json()
      setJobs(json.data ?? [])
      setAccessError(null)
    } else if (jobsRes.status === 401) {
      setAccessError('Authenticate to manage import jobs')
      setJobs([])
    }

    if (gapsRes.ok) {
      const gapsJson = await gapsRes.json()
      setGaps(gapsJson.data ?? [])
    } else {
      setGaps([])
    }

    setRefreshing(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function report(form: FormId, res: Response) {
    setNotice(
      res.ok
        ? { form, ok: true, text: 'Queued. An analyst must approve it before it reaches the tenant catalogue.' }
        : { form, ok: false, text: `Import was not queued (${res.status}).` },
    )
  }

  async function queuePlatform(e: React.FormEvent) {
    e.preventDefault()
    if (!platformName.trim()) return
    setLoading(true)
    const res = await fetch('/api/v1/platforms/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: platformName.trim(), category: 'uas' }),
    })
    report('platform', res)
    setPlatformName('')
    await refresh()
    setLoading(false)
  }


  async function queueDefeatMatrix(e: React.FormEvent) {
    e.preventDefault()
    if (!defeatPlatformId.trim() || !defeatSystemId.trim()) return
    setLoading(true)
    const body: Record<string, unknown> = {
      platform_id: defeatPlatformId.trim(),
      defeat_system_id: defeatSystemId.trim(),
      confidence,
      source_notes: defeatNotes.trim() || null,
    }
    if (pdDetect !== '') body.pd_detect_pct = Number(pdDetect)
    if (rfPct !== '') body.rf_jamming_pct = Number(rfPct)
    if (kineticPct !== '') body.kinetic_pct = Number(kineticPct)
    if (dewPct !== '') body.dew_pct = Number(dewPct)

    const res = await fetch('/api/v1/defeat-effectiveness/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    report('defeat', res)
    setDefeatPlatformId('')
    setDefeatSystemId('')
    setPdDetect('')
    setRfPct('')
    setKineticPct('')
    setDewPct('')
    setConfidence('Reported')
    setDefeatNotes('')
    await refresh()
    setLoading(false)
  }

  async function queueDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!docTitle.trim()) return
    setLoading(true)
    const res = await fetch('/api/v1/documents/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: docTitle.trim() }),
    })
    report('document', res)
    setDocTitle('')
    await refresh()
    setLoading(false)
  }

  async function approve(id: string) {
    await fetch(`/api/v1/import-jobs/${id}/approve`, { method: 'POST' })
    await refresh()
  }

  const noticeFor = (form: FormId) =>
    notice?.form === form ? (
      <p role="status" className={`mt-3 text-[12.5px] ${notice.ok ? 'text-[#6EE7A0]' : 'text-[#FF8A98]'}`}>
        {notice.text}
      </p>
    ) : null

  const jobColumns: DataColumn<ImportJob>[] = [
    {
      key: 'type',
      header: 'Type',
      width: 150,
      cell: (j) => JOB_TYPE_LABEL[j.job_type] ?? j.job_type,
      sortValue: (j) => j.job_type,
    },
    {
      key: 'item',
      header: 'Item',
      cell: (j) => (
        <span className="primary block max-w-[420px] truncate" title={jobLabel(j)}>
          {jobLabel(j)}
        </span>
      ),
      sortValue: (j) => jobLabel(j),
    },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      cell: (j) => <span className={`tag capitalize ${JOB_STATUS_TONE[j.status] ?? ''}`}>{j.status}</span>,
      sortValue: (j) => j.status,
    },
    {
      key: 'created',
      header: 'Queued',
      width: 170,
      className: 'mono',
      cell: (j) => (j.created_at ? j.created_at.slice(0, 16).replace('T', ' ') : ''),
      sortValue: (j) => j.created_at,
    },
    {
      key: 'action',
      header: <span className="sr-only">Action</span>,
      width: 120,
      align: 'right',
    headerClassName: '!text-right',
      cell: (j) =>
        j.status === 'queued' ? (
          <button type="button" onClick={() => approve(j.id)} className="btn-glass !min-h-[30px] !px-3 !text-[12px]">
            <Check className="h-3.5 w-3.5 text-[#4ADE80]" aria-hidden />
            Approve
          </button>
        ) : null,
    },
  ]

  return (
    <HubPageShell
      eyebrow="Administration"
      title="Data Import"
      subtitle="Tenant-scoped platform, Pd/Pk defeat matrix and document ingestion. Every import waits for analyst approval."
      headerAction={
        <div className="flex items-center gap-3">
          <EditionBadge />
          <p className="text-[11px] font-mono store-text-muted">Date of information: Jul 2026</p>
        </div>
      }
    >
      <div className="space-y-6">
        {accessError && (
          <p role="alert" className="flex items-center gap-2 text-[13px] text-[#FCD34D]">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {accessError}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5">
            <FormPanel
              icon={<Upload className="h-4 w-4 text-[var(--wb-blue)]" aria-hidden />}
              title="Platform import"
              description="Add a proprietary platform stub to this tenant’s catalogue."
            >
              <form onSubmit={queuePlatform}>
                <Field id="imp-platform-name" label="Platform name">
                  <input
                    id="imp-platform-name"
                    className={FIELD}
                    placeholder="Proprietary platform name"
                    autoComplete="off"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                  />
                </Field>
                <button type="submit" disabled={loading || !platformName.trim()} className={`${SUBMIT} mt-4`}>
                  Submit for approval
                </button>
                {noticeFor('platform')}
              </form>
            </FormPanel>

            <FormPanel
              icon={<FileUp className="h-4 w-4 text-[var(--wb-blue)]" aria-hidden />}
              title="Document import"
              description="Queue a source document for tenant ingestion."
            >
              <form onSubmit={queueDocument}>
                <Field id="imp-doc-title" label="Document title">
                  <input
                    id="imp-doc-title"
                    className={FIELD}
                    placeholder="Title as it should appear in the library"
                    autoComplete="off"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                  />
                </Field>
                <button type="submit" disabled={loading || !docTitle.trim()} className={`${SUBMIT} mt-4`}>
                  Submit for approval
                </button>
                {noticeFor('document')}
              </form>
            </FormPanel>
          </div>

          <FormPanel
            icon={<Grid3X3 className="h-4 w-4 text-[#4ADE80]" aria-hidden />}
            title="Defeat matrix row (Pd/Pk)"
            description="Tenant detection and defeat percentages for one platform against one defeat system."
          >
            <form onSubmit={queueDefeatMatrix} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="imp-dm-platform" label="Platform ID">
                  <input
                    id="imp-dm-platform"
                    className={`${FIELD} font-mono`}
                    placeholder="Catalogue platform ID"
                    autoComplete="off"
                    spellCheck={false}
                    value={defeatPlatformId}
                    onChange={(e) => setDefeatPlatformId(e.target.value)}
                  />
                </Field>
                <Field id="imp-dm-system" label="Defeat system ID">
                  <input
                    id="imp-dm-system"
                    className={`${FIELD} font-mono`}
                    placeholder="Catalogue defeat system ID"
                    autoComplete="off"
                    spellCheck={false}
                    value={defeatSystemId}
                    onChange={(e) => setDefeatSystemId(e.target.value)}
                  />
                </Field>
              </div>

              <fieldset className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <legend className="sr-only">Effectiveness percentages</legend>
                {(
                  [
                    ['imp-dm-pd', 'Pd detect (%)', pdDetect, setPdDetect],
                    ['imp-dm-rf', 'RF jamming (%)', rfPct, setRfPct],
                    ['imp-dm-kinetic', 'Kinetic (%)', kineticPct, setKineticPct],
                    ['imp-dm-dew', 'DEW (%)', dewPct, setDewPct],
                  ] as const
                ).map(([id, label, value, set]) => (
                  <Field key={id} id={id} label={label}>
                    <input
                      id={id}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      placeholder="0 to 100"
                      className={`${FIELD} text-right font-mono tabular-nums`}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                    />
                  </Field>
                ))}
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                <Field id="imp-dm-confidence" label="Confidence">
                  <select
                    id="imp-dm-confidence"
                    value={confidence}
                    onChange={(e) =>
                      setConfidence(e.target.value as (typeof CONFIDENCE_OPTIONS)[number])
                    }
                    className={`${FIELD} px-2.5`}
                  >
                    {CONFIDENCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="imp-dm-notes" label={<>Source notes <span className="font-normal store-text-muted">(optional)</span></>}>
                  <input
                    id="imp-dm-notes"
                    className={FIELD}
                    placeholder="Where these figures come from"
                    autoComplete="off"
                    value={defeatNotes}
                    onChange={(e) => setDefeatNotes(e.target.value)}
                  />
                </Field>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !defeatPlatformId.trim() || !defeatSystemId.trim()}
                  className={SUBMIT}
                >
                  Submit for approval
                </button>
                {noticeFor('defeat')}
              </div>
            </form>
          </FormPanel>
        </div>

        <section aria-labelledby="imp-jobs" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="imp-jobs" className="text-[15px] font-semibold text-[var(--store-ink)]">
              Import jobs
            </h2>
            {!refreshing ? (
              <span className="font-mono text-[12px] tabular-nums store-text-muted">
                {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
              </span>
            ) : null}
          </div>
          <DataTable
            rows={jobs}
            columns={jobColumns}
            rowKey={(j) => j.id}
            defaultSort={{ key: 'created', dir: 'desc' }}
            maxHeight="480px"
            caption="Import jobs"
            empty={
              refreshing
                ? 'Loading jobs…'
                : 'No import jobs yet. Queue a platform, defeat matrix row or document above. Each needs analyst approval before tenant commit.'
            }
          />
        </section>

        <section aria-labelledby="imp-gaps" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="imp-gaps" className="text-[15px] font-semibold text-[var(--store-ink)]">
              Catalogue data gaps
            </h2>
            {!refreshing ? (
              <span className="font-mono text-[12px] tabular-nums store-text-muted">
                {gaps.length} {gaps.length === 1 ? 'gap' : 'gaps'}
              </span>
            ) : null}
          </div>
          <DataTable
            rows={gaps}
            columns={GAP_COLUMNS}
            rowKey={(g) => g.id}
            maxHeight="520px"
            caption="Catalogue data gaps"
            empty={refreshing ? 'Loading gaps…' : 'No catalogue gaps reported.'}
          />
        </section>
      </div>
    </HubPageShell>
  )
}
