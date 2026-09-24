-- Base Protection: labelled example packages for the demo tenant.
--   is_example marks a seeded demonstration package. The UI tags it "Example"
--   and the first save by a user clears the flag. These are built from
--   catalogue systems to show the coverage and cost views; they are not
--   Defence plans and say nothing about what is fielded at these sites.
--   Williamtown is deliberately left with gaps at the edge of its circle.
-- Existing rows are never overwritten (ON CONFLICT DO NOTHING).
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

ALTER TABLE base_protection_site_plans
  ADD COLUMN IF NOT EXISTS is_example BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN base_protection_site_plans.is_example IS
  'Seeded demonstration package, not a tenant decision. Cleared when a user saves the site.';

INSERT INTO base_protection_site_plans (tenant_id, site_id, items, radius_m, is_example, updated_at)
SELECT t.id, v.site_id, v.items::jsonb, NULL, true, now()
FROM tenants t
CROSS JOIN (VALUES
  ('raaf-williamtown',
   '[{"systemId":"silentium-maverick-m8","qty":2},{"systemId":"dronesentry-sentrycs","qty":2},{"systemId":"dronegun-tactical","qty":4}]'),
  ('raaf-darwin',
   '[{"systemId":"anduril-lattice","qty":1},{"systemId":"pulsar-v","qty":2},{"systemId":"eos-slinger","qty":2}]'),
  ('al-minhad',
   '[{"systemId":"faad-c2-node","qty":1},{"systemId":"coyote-block-3","qty":2},{"systemId":"skynex","qty":2},{"systemId":"echodyne-echoguard","qty":4}]')
) AS v(site_id, items)
WHERE t.id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, site_id) DO NOTHING;
