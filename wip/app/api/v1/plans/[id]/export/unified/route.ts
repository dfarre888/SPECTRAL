/**
 * Unified battlespace plan export (SPECTRAL_UNIFIED_V1)
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/operations/audit';
import { requireTenantContext } from '@/lib/operations/tenant';
import {
  buildUnifiedExport,
  UNIFIED_EXPORT_SCHEMA,
  unifiedExportSections,
  validateUnifiedExport,
} from '@/lib/planner/export-unified';
import { plannerErrorResponse } from '@/lib/planner/planner-api-error';
import { getPlan } from '@/lib/planner/plan-store';

export const dynamic = 'force-dynamic';

async function handleExport(request: Request, planId: string) {
  const ctx = await requireTenantContext(request);
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const plan = await getPlan(planId, ctx.userId);
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const bundle = buildUnifiedExport(plan);
  const validation = validateUnifiedExport(bundle);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Invalid export bundle', details: validation.errors }, { status: 400 });
  }

  const body = JSON.stringify(validation.bundle);
  const content_sha256 = createHash('sha256').update(body).digest('hex');
  const byte_length = Buffer.byteLength(body, 'utf8');
  const sections = unifiedExportSections(validation.bundle);

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'planner.plan.export.unified',
    resourceType: 'battlespace_plan',
    resourceId: plan.id,
    classification: ctx.classification,
    metadata: {
      export_schema: UNIFIED_EXPORT_SCHEMA,
      content_sha256,
      byte_length,
      sections,
    },
  });

  return NextResponse.json({ data: validation.bundle, classification: ctx.classification });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    return await handleExport(request, params.id);
  } catch (err) {
    return plannerErrorResponse(err);
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    return await handleExport(request, params.id);
  } catch (err) {
    return plannerErrorResponse(err);
  }
}
