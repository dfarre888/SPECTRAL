import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { eventsToCsv } from '@/lib/wopr/export/csv'
import { exportFileName, scenarioToJson, type ExportFormat } from '@/lib/wopr/export/json'
import { scenarioToMsdl } from '@/lib/wopr/export/msdl'
import { getScenario, listTicks } from '@/lib/wopr/store'

export const dynamic = 'force-dynamic'

const FORMATS: Record<ExportFormat, string> = {
  json: 'application/json; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  msdl: 'application/xml; charset=utf-8',
}

/**
 * Download a scenario for analysis or federation.
 *   ?format=json  scenario, every recorded turn and the event log
 *   ?format=csv   event log: tick, time_min, side, entity, event_type, detail
 *   ?format=msdl  SISO-STD-007 MSDL of the initial laydown (HLA/DIS initialisation)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return new Response('Unauthorised', { status: 401 })

  const format = new URL(request.url).searchParams.get('format') as ExportFormat | null
  if (!format || !(format in FORMATS)) {
    return new Response('format must be json, csv or msdl', { status: 400 })
  }

  const scenario = await getScenario(params.id, ctx.tenantId)
  if (!scenario) return new Response('Not found', { status: 404 })

  const ticks = await listTicks(params.id, ctx.tenantId)
  const now = new Date()
  const body =
    format === 'json'
      ? scenarioToJson(scenario, ticks, now)
      : format === 'csv'
        ? eventsToCsv(ticks.map((t) => t.tick), scenario.classification)
        : scenarioToMsdl(scenario, { exportedAt: now, pocOrg: 'SPECTRAL' })

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'wopr.scenario.export',
    resourceType: 'wopr_scenario',
    resourceId: params.id,
    classification: ctx.classification,
    metadata: { format, turns: ticks.length },
  })

  return new Response(body, {
    headers: {
      'Content-Type': FORMATS[format],
      'Content-Disposition': `attachment; filename="${exportFileName(scenario, format)}"`,
      'Cache-Control': 'no-store',
      'X-Classification': scenario.classification.replace(/[^\x20-\x7E]/g, ''),
    },
  })
}
