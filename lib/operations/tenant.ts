import { createClient } from '@/lib/supabase/server'
import { parseClassification, type ClassificationMarking } from '@/lib/operations/classification'
import { isOperationsEdition } from '@/lib/operations/edition'

export interface TenantContext {
  tenantId: string
  tenantSlug: string
  userId: string | null
  role: 'operator' | 'analyst' | 'commander' | 'admin'
  classification: ClassificationMarking
}

const DEFAULT_TENANT_SLUG = process.env.SPECTRAL_DEFAULT_TENANT ?? 'default'

export async function requireTenantContext(request?: Request): Promise<TenantContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const headerTenant = request?.headers.get('x-spectral-tenant-id')
  const headerClass = request?.headers.get('x-spectral-classification')

  let tenantId = headerTenant ?? process.env.SPECTRAL_TENANT_ID ?? '00000000-0000-0000-0000-000000000001'
  let tenantSlug = DEFAULT_TENANT_SLUG
  let role: TenantContext['role'] = 'operator'

  if (isOperationsEdition() && user) {
    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id, role, tenants(slug)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (member?.tenant_id) {
      tenantId = member.tenant_id
      role = (member.role as TenantContext['role']) ?? 'operator'
      const tenants = member.tenants as { slug?: string } | { slug?: string }[] | null
      tenantSlug = Array.isArray(tenants) ? tenants[0]?.slug ?? tenantSlug : tenants?.slug ?? tenantSlug
    }
  }

  const classification = parseClassification(
    headerClass ??
      (user
        ? (
            await supabase
              .from('session_classification')
              .select('classification')
              .eq('user_id', user.id)
              .eq('tenant_id', tenantId)
              .maybeSingle()
          ).data?.classification
        : null),
  )

  return {
    tenantId,
    tenantSlug,
    userId: user?.id ?? null,
    role,
    classification,
  }
}
