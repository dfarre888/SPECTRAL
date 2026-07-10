import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/operations/audit";
import { requireTenantContext } from "@/lib/operations/tenant";
import { isOperationsEdition } from "@/lib/operations/edition";
import { createPlan, listPlans } from "@/lib/planner/plan-store";
import { emptyLaydownDocument, validateMapLaydownDocument } from "@/lib/planner/battlespace-plan";
import { plannerErrorResponse } from "@/lib/planner/planner-api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantContext(request);
    if (!ctx.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const tenantId = isOperationsEdition() ? ctx.tenantId : null;
    const data = await listPlans(ctx.userId, tenantId);
    return NextResponse.json({ data, classification: ctx.classification });
  } catch (err) {
    return plannerErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantContext(request);
    if (!ctx.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = (await request.json()) as {
      name?: string;
      vignetteId?: string;
      laydown?: import("@/lib/planner/battlespace-plan").MapLaydownDocument;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    if (body.laydown) {
      const validation = validateMapLaydownDocument(body.laydown);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    const plan = await createPlan({
      name: body.name.trim(),
      userId: ctx.userId,
      tenantId: isOperationsEdition() ? ctx.tenantId : null,
      classification: "UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY",
      vignetteId: body.vignetteId ?? null,
      laydown: body.laydown ?? emptyLaydownDocument(),
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "planner.plan.create",
      resourceType: "battlespace_plan",
      resourceId: plan.id,
      classification: ctx.classification,
    });

    return NextResponse.json({ data: plan, classification: ctx.classification });
  } catch (err) {
    return plannerErrorResponse(err);
  }
}
