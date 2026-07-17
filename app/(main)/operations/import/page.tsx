'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, FileUp, Grid3X3, Upload } from 'lucide-react'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StoreFilterSection } from '@/components/catalog/StoreFilterSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StorePanel } from '@/components/ui/store-surface'
import type { ImportJob } from '@/lib/operations/import'
import type { CatalogueDataGap } from '@/lib/operations/tenant-performance'

const CONFIDENCE_OPTIONS = ['Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected'] as const

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
    return 'Add a proprietary platform stub via platform import above.'
  }
  if (path === 'accredited_resolver') {
    return 'Requires accredited propagation resolver under contract — contact Spectral Operations support.'
  }
  return 'Submit tenant Pd/Pk via the defeat matrix import form below.'
}

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

  async function queuePlatform(e: React.FormEvent) {
    e.preventDefault()
    if (!platformName.trim()) return
    setLoading(true)
    await fetch('/api/v1/platforms/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: platformName.trim(), category: 'uas' }),
    })
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

    await fetch('/api/v1/defeat-effectiveness/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
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
    await fetch('/api/v1/documents/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: docTitle.trim() }),
    })
    setDocTitle('')
    await refresh()
    setLoading(false)
  }

  async function approve(id: string) {
    await fetch(`/api/v1/import-jobs/${id}/approve`, { method: 'POST' })
    await refresh()
  }

  return (
    <HubPageShell
      eyebrow="Operations"
      title="Customer Import"
      subtitle="Tenant-scoped platform, Pd/Pk defeat matrix, and document ingestion with human approval"
      headerAction={
        <p className="text-[10px] font-mono store-text-muted">Date of information: Jul 2026</p>
      }
    >
      <div className="grid gap-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <EditionBadge />
          {accessError && (
            <p className="text-xs font-mono text-amber">{accessError}</p>
          )}
        </div>

        <StorePanel inner className="p-5 space-y-4">
          <form onSubmit={queuePlatform} className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-white font-medium">
              <Upload className="w-4 h-4 text-[var(--store-accent)]" />
              Queue platform import
            </div>
            <Input
              placeholder="Platform name (proprietary)"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
            />
            <Button type="submit" disabled={loading} className="store-btn-primary">
              Submit for approval
            </Button>
          </form>

        </StorePanel>

        <StorePanel inner className="p-5 space-y-4">
          <form onSubmit={queueDefeatMatrix} className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-white font-medium">
              <Grid3X3 className="w-4 h-4 text-[var(--store-success)]" />
              Queue defeat matrix (Pd/Pk)
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Platform ID"
                value={defeatPlatformId}
                onChange={(e) => setDefeatPlatformId(e.target.value)}
              />
              <Input
                placeholder="Defeat system ID"
                value={defeatSystemId}
                onChange={(e) => setDefeatSystemId(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Pd detect %"
                value={pdDetect}
                onChange={(e) => setPdDetect(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="RF jamming %"
                value={rfPct}
                onChange={(e) => setRfPct(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Kinetic %"
                value={kineticPct}
                onChange={(e) => setKineticPct(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="DEW %"
                value={dewPct}
                onChange={(e) => setDewPct(e.target.value)}
              />
            </div>
            <select
              value={confidence}
              onChange={(e) =>
                setConfidence(e.target.value as (typeof CONFIDENCE_OPTIONS)[number])
              }
              className="flex h-9 w-full rounded-xl store-panel-inner px-3 py-1 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:border-[var(--store-accent-border)] font-mono"
            >
              {CONFIDENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <Input
              placeholder="Source notes (optional)"
              value={defeatNotes}
              onChange={(e) => setDefeatNotes(e.target.value)}
            />
            <Button type="submit" disabled={loading} className="store-btn-primary">
              Submit for approval
            </Button>
          </form>
        </StorePanel>

        <StorePanel inner className="p-5 space-y-4">
          <form onSubmit={queueDocument} className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-white font-medium">
              <FileUp className="w-4 h-4 text-[var(--store-accent)]" />
              Queue document import
            </div>
            <Input
              placeholder="Document title"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
            />
            <Button type="submit" disabled={loading} variant="outline">
              Submit for approval
            </Button>
          </form>
        </StorePanel>


        <StoreFilterSection label="Catalogue data gaps">
          {refreshing ? (
            <p className="text-sm store-text-muted font-mono">Loading gaps…</p>
          ) : gaps.length === 0 ? (
            <p className="text-sm store-text-body">No catalogue gaps reported.</p>
          ) : (
            <ul className="space-y-2">
              {gaps.map((gap) => (
                <li key={gap.id} className="store-panel-inner rounded-xl px-3 py-2.5 text-xs space-y-1">
                  <p className="store-text-body font-medium">{gap.label}</p>
                  <p className="store-text-muted leading-relaxed">{gap.reason}</p>
                  <p className="font-mono text-cyan text-[10px]">{resolutionHint(gap.resolution_path)}</p>
                </li>
              ))}
            </ul>
          )}
        </StoreFilterSection>

        <StoreFilterSection label="Import jobs">
          {refreshing ? (
            <p className="text-sm store-text-muted font-mono">Loading jobs…</p>
          ) : jobs.length === 0 ? (
            <p className="text-sm store-text-body">
              No import jobs yet. Queue a platform, defeat matrix row, or document above — analyst approval required
              before tenant commit.
            </p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between store-panel-inner rounded-xl px-3 py-2.5 text-xs"
                >
                  <span className="store-text-body">
                    {job.job_type} — {job.status} — {jobLabel(job)}
                  </span>
                  {job.status === 'queued' && (
                    <button
                      type="button"
                      onClick={() => approve(job.id)}
                      className="flex items-center gap-1 text-[var(--store-success)] hover:opacity-80 text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </StoreFilterSection>
      </div>
    </HubPageShell>
  )
}
