-- ============================================================================
-- Tend Care — RECOGNITIONS / KUDOS  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql, add_announcements.sql.
--
-- A lightweight peer-recognition feed surfaced alongside the Updates feed.
-- Any role can give kudos to a staff member (a short message + a badge).
--   • recognitions — one kudos: who it's for, who gave it, badge, message.
--
-- RLS mirrors the house-scoping model:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

CREATE TABLE IF NOT EXISTS recognitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id      uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide
  to_staff_id   uuid REFERENCES staff(id) ON DELETE SET NULL,
  to_staff_name text,
  from_name     text,
  from_role     text,
  badge         text,                 -- badge key (e.g. star | heart | leaf)
  message       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recognitions_org_created_idx
  ON recognitions (org_id, created_at);

ALTER TABLE recognitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recognitions_select" ON recognitions;
DROP POLICY IF EXISTS "recognitions_insert" ON recognitions;
DROP POLICY IF EXISTS "recognitions_delete" ON recognitions;

CREATE POLICY "recognitions_select" ON recognitions FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Any authenticated staff in the org can give kudos.
CREATE POLICY "recognitions_insert" ON recognitions FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "recognitions_delete" ON recognitions FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() = 'supervisor'
);
