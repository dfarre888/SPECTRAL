import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/operations/audit";
import { requireTenantContext } from "@/lib/operations/tenant";
import { deletePlan, getPlan, updatePlan } from "@/lib/planner/plan-store";
import { validateMapLaydownDocument } from "@/lib/planner/battlespace-plan";
import { plannerErrorResponse } from "@/lib/planner/planner-api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireTenantContext(request);
    if (!ctx.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const plan = await getPlan(params.id, ctx.userId);
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: plan, classification: ctx.classification });
  } catch (err) {
    return plannerErrorResponse(err);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireTenantContext(request);
    if (!ctx.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = (await request.json()) as Parameters<typeof updatePlan>[2];
    if (body.laydown) {
      const validation = validateMapLaydownDocument(body.laydown);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    const plan = await updatePlan(params.id, ctx.userId, body);
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "planner.plan.update",
      resourceType: "battlespace_plan",
      resourceId: plan.id,
      classification: ctx.classification,
    });

    return NextResponse.json({ data: plan, classification: ctx.classification });
  } catch (err) {
    return plannerErrorResponse(err);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireTenantContext(request);
    if (!ctx.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    await deletePlan(params.id, ctx.userId);

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "planner.plan.delete",
      resourceType: "battlespace_plan",
      resourceId: params.id,
      classification: ctx.classification,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return plannerErrorResponse(err);
  }
}
