import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/operations/tenant";
import { getPlan } from "@/lib/planner/plan-store";
import { exportPlanToLms } from "@/lib/planner/export-lms";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await requireTenantContext(_request);
  if (!ctx.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const plan = await getPlan(params.id, ctx.userId);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: exportPlanToLms(plan), classification: ctx.classification });
}
