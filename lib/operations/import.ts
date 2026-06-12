import { createClient } from '@/lib/supabase/server'
import { roleCanImportPlatforms } from '@/lib/operations/auth-config'

export interface ImportJob {
  id: string
  tenant_id: string
  job_type: 'platform' | 'document' | 'buildings'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  created_by: string
  created_at: string
}

const memoryJobs = new Map<string, ImportJob>()

export async function createImportJob(
  tenantId: string,
  userId: string,
  jobType: ImportJob['job_type'],
  payload: Record<string, unknown>,
): Promise<ImportJob> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('import_jobs')
      .insert({
        tenant_id: tenantId,
        job_type: jobType,
        payload,
        created_by: userId,
        status: 'queued',
      })
      .select('*')
      .single()
    if (error) throw error
    return rowToJob(data)
  } catch {
    const job: ImportJob = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      job_type: jobType,
      status: 'queued',
      payload,
      result: null,
      error: null,
      created_by: userId,
      created_at: new Date().toISOString(),
    }
    memoryJobs.set(job.id, job)
    return job
  }
}

export async function getImportJob(id: string, tenantId: string): Promise<ImportJob | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (data) return rowToJob(data)
  } catch {
    const j = memoryJobs.get(id)
    if (j?.tenant_id === tenantId) return j
  }
  return null
}

export async function listImportJobs(tenantId: string): Promise<ImportJob[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50)
    return (data ?? []).map(rowToJob)
  } catch {
    return [...memoryJobs.values()].filter((j) => j.tenant_id === tenantId)
  }
}

export async function approveImportJob(
  jobId: string,
  tenantId: string,
  approverId: string,
  role: string,
): Promise<ImportJob> {
  if (!roleCanImportPlatforms(role)) {
    throw new Error('Forbidden')
  }

  const job = await getImportJob(jobId, tenantId)
  if (!job) throw new Error('Not found')
  if (job.status !== 'queued' && job.status !== 'processing') {
    throw new Error('Job not approvable')
  }

  const result = await processApprovedJob(job, approverId)

  try {
    const supabase = await createClient()
    await supabase
      .from('import_jobs')
      .update({
        status: 'completed',
        result,
      })
      .eq('id', jobId)
  } catch {
    memoryJobs.set(jobId, { ...job, status: 'completed', result })
  }

  return { ...job, status: 'completed', result }
}

async function processApprovedJob(
  job: ImportJob,
  approverId: string,
): Promise<Record<string, unknown>> {
  if (job.job_type === 'platform') {
    const payload = job.payload as {
      name?: string
      manufacturer?: string
      category?: string
      capabilities?: unknown[]
    }
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('platforms')
        .insert({
          name: payload.name ?? 'Customer platform',
          manufacturer: payload.manufacturer ?? 'Proprietary',
          category: payload.category ?? 'uas',
          tenant_id: job.tenant_id,
          source: 'customer_proprietary',
          classification: 'UNCLASSIFIED',
          capabilities: payload.capabilities ?? [],
        })
        .select('id')
        .single()
      return { platform_id: data?.id, approved_by: approverId, confidence: 'Reported' }
    } catch {
      return { platform_id: crypto.randomUUID(), approved_by: approverId, confidence: 'Reported' }
    }
  }

  if (job.job_type === 'document') {
    const payload = job.payload as { title?: string; mime_type?: string; storage_path?: string }
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('customer_documents')
        .insert({
          tenant_id: job.tenant_id,
          title: payload.title ?? 'Imported document',
          mime_type: payload.mime_type ?? 'application/pdf',
          storage_path: payload.storage_path ?? `/tenant/${job.tenant_id}/pending`,
          status: 'approved',
          approved_by: approverId,
          created_by: job.created_by,
        })
        .select('id')
        .single()
      return { document_id: data?.id, approved_by: approverId }
    } catch {
      return { document_id: crypto.randomUUID(), approved_by: approverId }
    }
  }

  return { approved_by: approverId }
}

function rowToJob(row: Record<string, unknown>): ImportJob {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    job_type: row.job_type as ImportJob['job_type'],
    status: row.status as ImportJob['status'],
    payload: (row.payload as Record<string, unknown>) ?? {},
    result: (row.result as Record<string, unknown>) ?? null,
    error: (row.error as string) ?? null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
  }
}
