-- SPECTRAL Planner review remediation — FK hardening + revision DELETE + user_id orphan policy
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

ALTER TABLE engagement_economics
  ADD CONSTRAINT engagement_economics_platform_fk
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
  ADD CONSTRAINT engagement_economics_defeat_fk
    FOREIGN KEY (defeat_system_id) REFERENCES anti_drone_systems(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS battlespace_plan_revisions_delete ON battlespace_plan_revisions;
CREATE POLICY battlespace_plan_revisions_delete ON battlespace_plan_revisions
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM battlespace_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())
  );

-- Orphan plans when auth user is deleted — retain tenant-visible history with null owner.
ALTER TABLE battlespace_plans ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE battlespace_plans
  DROP CONSTRAINT IF EXISTS battlespace_plans_user_id_fkey;

ALTER TABLE battlespace_plans
  ADD CONSTRAINT battlespace_plans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN battlespace_plans.user_id IS
  'Plan owner; SET NULL on auth.users delete so tenant plans remain for audit. RLS restricts writes to auth.uid().';
