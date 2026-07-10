import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/operations/audit";
import { requireTenantContext } from "@/lib/operations/tenant";
import { getPlan, updatePlan } from "@/lib/planner/plan-store";
import { publishPlanToPcm } from "@/lib/planner/publish-pcm";
import { verifyDsPlayerId } from "@/lib/planner/verify-ds-player";
import { plannerErrorResponse } from "@/lib/planner/planner-api-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireTenantContext(request);
    if (!ctx.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const plan = await getPlan(params.id, ctx.userId);
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as { dsPlayerId?: string };
    const dsPlayerId = body.dsPlayerId ?? ctx.userId;

    const auth = await verifyDsPlayerId(dsPlayerId, ctx.userId, ctx.tenantId);
    if (!auth.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await publishPlanToPcm(plan, dsPlayerId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await updatePlan(plan.id, ctx.userId, {
      published_pcm_exercise_id: result.exerciseId,
      phase: "rehearse",
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "planner.plan.publish.pcm",
      resourceType: "battlespace_plan",
      resourceId: plan.id,
      classification: ctx.classification,
      metadata: { exercise_id: result.exerciseId, scenario_id: result.scenarioId, ds_player_id: dsPlayerId },
    });

    return NextResponse.json({ data: result, classification: ctx.classification });
  } catch (err) {
    return plannerErrorResponse(err);
  }
}
