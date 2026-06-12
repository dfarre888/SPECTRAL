import { createClient } from '@/lib/supabase/server'
import type { ClassificationMarking } from '@/lib/operations/classification'

export interface AuditEntry {
  tenantId: string
  userId: string | null
  action: string
  resourceType?: string
  resourceId?: string
  classification: ClassificationMarking
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('audit_log').insert({
      tenant_id: entry.tenantId,
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      classification: entry.classification,
      metadata: entry.metadata ?? {},
    })
  } catch (err) {
    console.error('[audit_log]', err)
  }
}
