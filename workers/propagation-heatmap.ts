/**
 * Standalone propagation heatmap worker entrypoint.
 * Poll Redis/BullMQ when REDIS_URL is configured; otherwise jobs run in-process via lib/queue/heatmap-jobs.ts.
 *
 * Usage: npx tsx workers/propagation-heatmap.ts
 */
console.log(
  '[spectral-worker] Heatmap jobs run in-process via POST /api/v1/propagation/heatmap/jobs. ' +
    'Connect REDIS_URL + BullMQ for distributed workers (Helm propagationWorkers).',
)
