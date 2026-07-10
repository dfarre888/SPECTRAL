import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/operations/audit";
import { requireTenantContext } from "@/lib/operations/tenant";
import { getMapAssets } from "@/lib/map/queries";
import { getPlan, updatePlan } from "@/lib/planner/plan-store";
import { publishPlanToWopr } from "@/lib/planner/publish-wopr";
import { createScenario } from "@/lib/wopr/store";
import { plannerErrorResponse } from "@/lib/planner/planner-api-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireTenantContext(request);
    if (!ctx.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const plan = await getPlan(params.id, ctx.userId);
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const catalog = await getMapAssets();
    const { worldState, propagationEvents } = await publishPlanToWopr(plan, ctx.tenantId, catalog);
    const scenario = await createScenario(
      ctx.tenantId,
      ctx.userId,
      `Planner: ${plan.name}`,
      ctx.classification,
      worldState,
    );

    await updatePlan(plan.id, ctx.userId, { published_wopr_id: scenario.id, phase: "rehearse" });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "planner.plan.publish.wopr",
      resourceType: "battlespace_plan",
      resourceId: plan.id,
      classification: ctx.classification,
      metadata: { wopr_id: scenario.id, propagation_events: propagationEvents.length },
    });

    return NextResponse.json({ data: { scenario, propagationEvents }, classification: ctx.classification });
  } catch (err) {
    return plannerErrorResponse(err);
  }
}
