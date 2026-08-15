-- Local development seed — runs automatically after migrations on
-- `supabase start` (fresh DB) and `supabase db reset`.
--
-- Why this exists: hosted Supabase configures default privileges on the
-- `public` schema so that migration-created tables are readable by the
-- anon / authenticated / service_role roles. The local stack does NOT set
-- those defaults, so without the grants below every table returns
-- "permission denied for table ..." (even in demo mode, which reads via the
-- service role). This file restores the expected local grants; it changes no
-- application data and is only loaded by the local Supabase CLI.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
