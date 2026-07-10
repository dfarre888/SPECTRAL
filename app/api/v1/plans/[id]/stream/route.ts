import { requireTenantContext } from "@/lib/operations/tenant";
import { subscribePlan } from "@/lib/planner/plan-live-bus";
import { getPlan } from "@/lib/planner/plan-store";
import { isOperationsEdition } from "@/lib/operations/edition";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 25_000;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const ctx = await requireTenantContext(request);
  if (!ctx.userId) return new Response("Unauthorised", { status: 401 });

  const plan = await getPlan(params.id, ctx.userId);
  if (!plan) return new Response("Not found", { status: 404 });

  const tenantId = isOperationsEdition() ? ctx.tenantId : null;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let streamController: ReadableStreamDefaultController | null = null;

  const cleanup = (controller: ReadableStreamDefaultController, reason = "closed") => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    unsubscribe?.();
    unsubscribe = null;
    try {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "close", payload: { reason } })}\n\n`),
      );
      controller.close();
    } catch {
      // stream already closed
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", planId: params.id })}\n\n`),
      );
      unsubscribe = subscribePlan(tenantId, params.id, (event) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          cleanup(controller, "enqueue_failed");
        }
      });
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup(controller, "heartbeat_failed");
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      if (streamController) cleanup(streamController, "client_cancel");
      else {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
      }
    },
  });

  request.signal.addEventListener("abort", () => {
    if (streamController) cleanup(streamController, "request_aborted");
    else {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
