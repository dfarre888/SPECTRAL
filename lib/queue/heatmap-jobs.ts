import { computeHeatmap } from '@/lib/propagation/heatmap'
import type { HeatmapRequest, HeatmapResult } from '@/lib/propagation/types'

export type HeatmapJobStatus = 'queued' | 'running' | 'complete' | 'failed'

export interface HeatmapJob {
  id: string
  status: HeatmapJobStatus
  progress: number
  result?: HeatmapResult
  error?: string
  createdAt: number
}

const jobs = new Map<string, HeatmapJob>()
const MAX_JOBS = 200

function pruneJobs() {
  if (jobs.size <= MAX_JOBS) return
  const sorted = [...jobs.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)
  for (let i = 0; i < sorted.length - MAX_JOBS; i++) {
    jobs.delete(sorted[i][0])
  }
}

export function createHeatmapJob(request: HeatmapRequest): string {
  const id = `hm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  jobs.set(id, { id, status: 'queued', progress: 0, createdAt: Date.now() })
  pruneJobs()

  setImmediate(async () => {
    const job = jobs.get(id)
    if (!job) return
    job.status = 'running'
    job.progress = 10
    try {
      const result = computeHeatmap(request)
      job.status = 'complete'
      job.progress = 100
      job.result = result
    } catch (err) {
      job.status = 'failed'
      job.error = err instanceof Error ? err.message : 'Heatmap failed'
    }
  })

  return id
}

export function getHeatmapJob(id: string): HeatmapJob | null {
  return jobs.get(id) ?? null
}

/** Process job synchronously (worker entrypoint / dev fallback). */
export function runHeatmapJobSync(id: string, request: HeatmapRequest): HeatmapResult {
  const job = jobs.get(id) ?? {
    id,
    status: 'running' as const,
    progress: 0,
    createdAt: Date.now(),
  }
  jobs.set(id, job)
  const result = computeHeatmap(request)
  job.status = 'complete'
  job.progress = 100
  job.result = result
  return result
}
