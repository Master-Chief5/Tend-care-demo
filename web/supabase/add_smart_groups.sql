-- ============================================================================
-- Tend Care — SMART GROUPS  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds one table backing reusable "saved audiences": a named group that expands
-- to a set of staff via house + roles + an optional required cert. A convenience
-- layer over the ad-hoc targeting in Updates — picking a group pre-fills the
-- audience scope (house + roles) on a new post.
--   • smart_groups — a saved audience (org-wide or house-scoped), a set of roles
--                    ('manager' | 'staff'; empty = any role), and an optional
--                    required_cert filter.
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house.
--   • anyone in scope may create a group; only managers/supervisors may delete.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_role(),
-- auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── smart_groups ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smart_groups (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide
  name             text NOT NULL,
  roles            text[] NOT NULL DEFAULT '{}',   -- 'manager' | 'staff'; empty = any role
  required_cert    text,                            -- NULL = no cert filter
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smart_groups_org_house_idx
  ON smart_groups (org_id, house_id);

ALTER TABLE smart_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "smart_groups_select" ON smart_groups;
DROP POLICY IF EXISTS "smart_groups_insert" ON smart_groups;
DROP POLICY IF EXISTS "smart_groups_delete" ON smart_groups;

CREATE POLICY "smart_groups_select" ON smart_groups FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Anyone in the org may create a saved audience.
CREATE POLICY "smart_groups_insert" ON smart_groups FOR INSERT WITH CHECK (
  org_id = auth_org_id()
);
-- Only managers/supervisors may delete.
CREATE POLICY "smart_groups_delete" ON smart_groups FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
