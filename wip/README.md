# Parked work-in-progress

Moved out of the build on 2026-09-01 so the app compiles and can be deployed.

**Why:** three APIs were designed and consumed here but never implemented anywhere
in the repo:

| Missing export | Expected module |
|---|---|
| `ensurePlanDocumentV2`, `MapLaydownDocumentV2`, `migrateV1ToV2` | `@/lib/planner/battlespace-plan` |
| `auditDecision`, `AuditPersistError`, `clearMemoryAuditLog`, `enableAuditTestMode`, `getMemoryAuditLog`, `requirePersisted` | `@/lib/operations/audit` |
| `CommandPlanOption` | `@/lib/command/go-no-go-types` |

Together these caused 55 of the 66 TypeScript errors and stopped `next build`
outright. Every file here was untracked — one interrupted feature push, not
shipped code.

**Nothing outside this folder imported any of it**, which is why parking it is safe.

## What's here
- Command Board module — `app/(main)/command`, `app/api/v1/command`,
  `components/command`, `lib/command`
- Unified plan export — `lib/planner/export-unified.ts`,
  `app/api/v1/plans/[id]/export/unified`
- Three test suites written against the missing APIs

## To resume
Decide what the three APIs should do, implement them in their real modules, then
move these directories back and re-add the `command` module to
`lib/navigation/modules.ts`.

Excluded from `tsconfig.json` and `vitest.config.ts`.
