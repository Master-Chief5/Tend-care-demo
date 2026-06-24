-- ============================================================================
-- Tend Care — KNOWLEDGE BASE / HANDBOOK  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds one table backing a searchable "Handbook" — an SOP / policy / house-binder
-- library:
--   • kb_articles            — a policy / SOP / house note, org-wide (house_id
--                              IS NULL = "All staff") or house-scoped, with an
--                              optional category and a "pinned" flag for sorting.
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house.
--   • Only managers/supervisors create, edit, or delete articles.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── kb_articles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kb_articles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide "All staff"
  category         text,
  title            text,
  body             text NOT NULL,
  pinned           boolean NOT NULL DEFAULT false,
  updated_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_articles_org_house_updated_idx
  ON kb_articles (org_id, house_id, updated_at);

ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kb_articles_select" ON kb_articles;
DROP POLICY IF EXISTS "kb_articles_insert" ON kb_articles;
DROP POLICY IF EXISTS "kb_articles_update" ON kb_articles;
DROP POLICY IF EXISTS "kb_articles_delete" ON kb_articles;

CREATE POLICY "kb_articles_select" ON kb_articles FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only managers/supervisors create, edit, or delete.
CREATE POLICY "kb_articles_insert" ON kb_articles FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "kb_articles_update" ON kb_articles FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "kb_articles_delete" ON kb_articles FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
