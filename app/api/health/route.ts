import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    edition: process.env.SPECTRAL_EDITION ?? "training",
    timestamp: new Date().toISOString(),
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("platforms").select("id", { count: "exact", head: true });
    checks.database = error ? "degraded" : "ok";
  } catch {
    checks.database = "unavailable";
  }

  const healthy = checks.database !== "unavailable";
  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks },
    { status: healthy ? 200 : 503 },
  );
}
