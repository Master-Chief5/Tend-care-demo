-- ============================================================================
-- Tend Care — DIRECTORY of external contacts  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds one table backing a lightweight "Directory" screen: the external work
-- contacts DSPs reach for on shift (pharmacy, physicians, case managers,
-- guardians, vendors, emergency lines):
--   • contacts — a contact (org-wide or house-scoped) with a kind tag, the
--                organization it belongs to, phone, email, and free-form notes.
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house.
--   • only supervisors/managers may add, edit, or delete.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── contacts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id    uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide "All houses"
  name        text NOT NULL,
  kind        text,                 -- pharmacy | physician | guardian | case_manager | vendor | emergency | other
  org_name    text,                 -- organization the contact belongs to
  phone       text,
  email       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contacts_org_house_kind_idx
  ON contacts (org_id, house_id, kind);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select" ON contacts;
DROP POLICY IF EXISTS "contacts_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_update" ON contacts;
DROP POLICY IF EXISTS "contacts_delete" ON contacts;

CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only supervisors/managers manage the directory.
CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "contacts_delete" ON contacts FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
