-- WOPR demo admin bootstrap for local Operations + demo mode dev
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

INSERT INTO tenants (id, slug, name, edition)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'spectral-local',
  'Spectral Local Dev',
  'operations'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_members (tenant_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000099',
  'admin'
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;
