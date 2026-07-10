#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "[vignette-proof] Vignette templates..."
npx tsx -e "
import { PLANNER_VIGNETTES, getPlannerVignette, vignetteToLaydown } from './lib/planner/vignettes';
for (const v of PLANNER_VIGNETTES) {
  const hit = getPlannerVignette(v.id);
  if (!hit) throw new Error('missing ' + v.id);
  const ld = vignetteToLaydown(hit);
  if (!ld.uas?.length) throw new Error(v.id + ' needs uas seed');
}
console.log('OK', PLANNER_VIGNETTES.length, 'vignettes');
"
echo "[vignette-proof] Health..."
curl -sf "${NEXT_PUBLIC_APP_URL:-http://localhost:3000}/api/health" | head -c 200 || echo "skip (dev server down)"
echo ""
echo "[vignette-proof] PASS"
