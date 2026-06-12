'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, FileUp, Upload } from 'lucide-react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StoreFilterSection } from '@/components/catalog/StoreFilterSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StorePanel } from '@/components/ui/store-surface'
import type { ImportJob } from '@/lib/operations/import'

export default function OperationsImportPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [platformName, setPlatformName] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/v1/import-jobs')
    if (res.ok) {
      const json = await res.json()
      setJobs(json.data ?? [])
    }
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
      subtitle="Tenant-scoped platform and document ingestion with human approval workflow"
    >
      <div className="grid gap-6 max-w-3xl">
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
          <form onSubmit={queueDocument} className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-white font-medium">
              <FileUp className="w-4 h-4 text-purple" />
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

        <StoreFilterSection label="Import jobs">
          {jobs.length === 0 ? (
            <p className="text-sm store-text-body">No import jobs yet.</p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between store-panel-inner rounded-xl px-3 py-2.5 text-xs"
                >
                  <span className="store-text-body">
                    {job.job_type} — {job.status} —{' '}
                    {(job.payload.name as string) ??
                      (job.payload.title as string) ??
                      job.id.slice(0, 8)}
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
