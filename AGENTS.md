# AGENTS.md

Project-level guidance for AI agents working in this repository. Product, stack,
security, and design rules live in `CLAUDE.md` and `.cursor/rules/`. Read those
first for anything about *what* to build. This file focuses on *how to run and
develop* the app.

## Cursor Cloud specific instructions

Spectral is a single Next.js 14 (App Router) web app backed by Supabase
(Postgres + PostgREST + Auth). There is one service to run for development: the
Next.js dev server, plus a local Supabase stack that provides its database.

### One-time-per-VM startup (already-installed tooling)

The update script only runs `npm install`. Docker Engine and the Supabase CLI are
baked into the VM snapshot, but no daemons are running on a fresh boot. Bring the
environment up in this order:

1. Start the Docker daemon (there is no systemd here, so run it directly) and make
   the socket usable without sudo:
   - `sudo dockerd` &nbsp;(leave running in its own tmux window; logs to your chosen file)
   - `sudo chmod 666 /var/run/docker.sock`
   - Docker 29 is configured for this VM via `/etc/docker/daemon.json` with
     `storage-driver: fuse-overlayfs` and `containerd-snapshotter: false`, and
     iptables is switched to `iptables-legacy`. If Docker was reinstalled, reapply
     those or the daemon will not start in this Firecracker VM.
2. Start Supabase and apply migrations + seed (run from repo root):
   - `supabase start` — pulls/starts containers and applies all
     `supabase/migrations/*.sql` (152 platforms, C-UAS systems, GNSS, conflicts, etc.).
   - API: `http://127.0.0.1:54321` · Studio: `http://127.0.0.1:54323` · DB: `:54322`.
3. **Non-obvious gotcha — grant table privileges.** On hosted Supabase the
   `public` schema has platform-managed default privileges; the local stack does
   **not**, so every table created by the migrations ends up with no grants and
   the app fails with `permission denied for table platforms` (even in demo mode,
   which reads via the service role). After `supabase start`, run once against the
   local DB (`docker exec -i supabase_db_SPECTRAL psql -U postgres -d postgres`):
   ```sql
   GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
   GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
   ```
   (`no privileges were granted for "gtrgm_*"` warnings from `pg_trgm` are harmless.)

### Environment file

`.env.local` is gitignored (create it from `.env.local.example`). For local dev it
must point at the local Supabase stack, using the keys printed by `supabase start`
(or `supabase status`):

- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon JWT>`
- `SUPABASE_SERVICE_ROLE_KEY=<local service_role JWT>`
- `NEXT_PUBLIC_DEMO_MODE=true` — bypasses the auth gate (`middleware.ts`) and makes
  `lib/supabase/server.ts` read via the service role, so all modules work without a
  login. Never set this `true` in production. Env changes require a dev-server restart.

### Run / lint / test (see `package.json` scripts)

- Dev server: `npm run dev` → `http://localhost:3000`. Uses `.env.local`.
- Lint: `npm run lint` · Types: `npm run type-check`.
- Tests (Vitest): `npm run test:spectral:all` (and `test:moat`, `test:gnss`, etc.).
- `npm run build` is the production/standalone build and bakes placeholder env — not
  needed for development; use `npm run dev`.

### Known pre-existing failures (not environment problems)

These fail on a clean checkout, independent of setup — do not chase them as env issues:

- `npm run type-check`: 1 error in `data/seed-platforms.ts` (`"assessed"` not
  assignable to `SourceConfidence`). This also blocks `npm run build`.
- `npm run lint`: 1 a11y warning in `components/defeat/MatrixCell.tsx`, which fails
  the run because of `--max-warnings 0`.
- `npm run test:spectral:all`: `_test_phase3` / `_test_phase4-adjudication` fail to
  import because a transitive `server-only` import throws under Vitest (no stub in
  `vitest.config.ts`); `_test_moat` has 2 IADS-catalogue assertions that expect 14
  entries but the data now has 15. Phase 1/2 pass.
