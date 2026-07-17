# Phase 4 — Agent A: Hydration + Shell (Sprint 0)

**Date:** 2026-07-17  
**Scope:** Layout/shell provider tree, server→client boundary, dead code removal  
**Dev:** `http://localhost:3001`

---

## Root cause

`Cannot read properties of null (reading 'useContext')` was caused by an invalid **server/client module boundary** in `components/layout/FullBleedLayout.tsx`.

That file lived under `components/` (shared module graph) and imported:

1. **`AppChrome`** — a `'use client'` component that mounts `MobileNavProvider`, `Sidebar`, and `Topbar` (all React context/hooks consumers)
2. **`getPlatformCount`** from `@/lib/platforms/queries` — marked `import 'server-only'`

ESLint already flagged this (`no-restricted-imports` on `@/lib/platforms/queries` in `FullBleedLayout.tsx`). Mixing server-only data access with a client chrome wrapper in a shared component file risks pulling server-only code into the client bundle graph. When React’s internal dispatcher is null (broken module graph / wrong React instance context), every hook call surfaces as `useContext` on null — which is exactly what Phase 3 Playwright captures recorded on `/`, `/map`, and most other routes.

**Not the cause (verified):**

| Check | Result |
|-------|--------|
| Duplicate React | `npm ls react` — single `react@18.3.1` tree, all deduped |
| Missing `MobileNavProvider` | Provider tree in `AppChrome` was correct; `Sidebar`/`Topbar` were already wrapped |
| Client hooks in server pages | No new violations; issue was layout boundary, not page components |

The correct pattern already existed for `(main)` routes: **async server layout** (`app/(main)/layout.tsx`) fetches counts → **client shell** (`MainShell`) → **`AppChrome`**.

---

## Fix applied

1. **Extended `MainShell`** with `fullBleed` and `moduleLabel` props (passed through to `AppChrome`).
2. **Moved server data fetching** into route layouts:
   - `app/map/layout.tsx` — async, fetches currency/platform counts, renders `MainShell`
   - `app/spectrum/layout.tsx` — same pattern
3. **Deleted** `components/layout/FullBleedLayout.tsx` — removed the invalid shared server+client boundary.
4. **Deleted** `components/layout/FullBleedShell.tsx` — superseded by unified `AppChrome`; no app imports remained.

Provider tree (unchanged, now reached via clean boundary):

```
Server layout (app/*/layout.tsx)
  └─ MainShell ('use client')
       └─ AppChrome ('use client')
            └─ MobileNavProvider
                 ├─ Sidebar (useMobileNav)
                 ├─ Topbar (useMobileNav)
                 └─ main → children
```

---

## Before / after console (`/` and `/map`)

Captured with Playwright (`pageerror` + `console` type `error`), `waitUntil: domcontentloaded`.

### Before (Phase 3 — `docs/ux-audit/phase3/capture-results.json`)

| Route | Console errors |
|-------|----------------|
| `/` | `Cannot read properties of null (reading 'useContext')` ×3 |
| `/map` | `Cannot read properties of null (reading 'useContext')` ×3 |

(Same error repeated on ~20 certified routes in Phase 3 capture.)

### After (Phase 4 — `docs/ux-audit/phase4/console-check.json`)

| Route | Console errors |
|-------|----------------|
| `/` | **[]** — zero errors |
| `/map` | **[]** — zero errors |

Spot-check on 7 routes (`/`, `/map`, `/platforms`, `/spectrum`, `/gnss`, `/arena`, `/pcm`): zero `useContext` pageerrors.

**Note:** `/map` may still emit a React dev warning from `CesiumMapPanel` (`setState` during render) — out of scope for Agent A (map panel token sweep owned by Agent B). That is a warning, not the hydration `useContext` crash.

---

## Verification command

```bash
node -e "
const { chromium } = require('playwright');
const { mkdir, writeFile } = require('fs/promises');
const path = require('path');
const BASE = 'http://localhost:3001';
const ROUTES = [{ slug: 'home', path: '/' }, { slug: 'map', path: '/map' }];
(async () => {
  const outDir = path.join(process.cwd(), 'docs/ux-audit/phase4');
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];
  for (const { slug, path: route } of ROUTES) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message)));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(slug === 'map' ? 4000 : 2000);
    results.push({ slug, route, errors });
  }
  await browser.close();
  await writeFile(path.join(outDir, 'console-check.json'), JSON.stringify(results, null, 2));
})();
"
```

---

## Files changed

| File | Action |
|------|--------|
| `components/layout/MainShell.tsx` | Added `fullBleed`, `moduleLabel` props |
| `app/map/layout.tsx` | Async server layout → `MainShell` (replaces `FullBleedLayout`) |
| `app/spectrum/layout.tsx` | Async server layout → `MainShell` (replaces `FullBleedLayout`) |
| `components/layout/FullBleedLayout.tsx` | **Deleted** |
| `components/layout/FullBleedShell.tsx` | **Deleted** |
| `docs/ux-audit/phase4/console-check.json` | Verification artifact |
| `docs/ux-audit/phase4/agent-a-hydration.md` | This report |

**Unchanged (already correct):** `AppChrome.tsx`, `MobileNavContext.tsx`, `app/(main)/layout.tsx`, `app/layout.tsx`.
