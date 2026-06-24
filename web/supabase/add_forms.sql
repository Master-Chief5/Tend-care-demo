-- ============================================================================
-- Tend Care — FORMS module  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds two tables backing a no-code "Forms" module (shift checklists, safety
-- walkthroughs, audits):
--   • form_templates    — a reusable form (org-wide or house-scoped) whose
--                          `fields` jsonb describes the questions:
--                          [{key,label,type:'text'|'number'|'checkbox'|'select',
--                            options,required}].
--   • form_submissions  — one filled-out instance of a template; `answers` jsonb
--                          maps field key → value; status 'open' until an admin
--                          marks it 'reviewed'.
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house.
--   Templates are authored by supervisors/managers only; any role may submit;
--   only supervisors/managers review (update) submissions.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: tables use IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── form_templates ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide "All staff"
  name             text NOT NULL,
  description      text,
  fields           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{key,label,type,options,required}]
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_templates_org_house_created_idx
  ON form_templates (org_id, house_id, created_at);

ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_templates_select" ON form_templates;
DROP POLICY IF EXISTS "form_templates_insert" ON form_templates;
DROP POLICY IF EXISTS "form_templates_update" ON form_templates;
DROP POLICY IF EXISTS "form_templates_delete" ON form_templates;

CREATE POLICY "form_templates_select" ON form_templates FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only managers/supervisors build forms.
CREATE POLICY "form_templates_insert" ON form_templates FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "form_templates_update" ON form_templates FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "form_templates_delete" ON form_templates FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);

-- ── form_submissions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_submissions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id           uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide "All staff"
  template_id        uuid REFERENCES form_templates(id) ON DELETE CASCADE,
  answers            jsonb NOT NULL DEFAULT '{}'::jsonb,   -- field key → value
  submitted_by_name  text,
  submitted_at       timestamptz NOT NULL DEFAULT now(),
  status             text NOT NULL DEFAULT 'open',   -- 'open' | 'reviewed'
  reviewed_by_name   text
);

CREATE INDEX IF NOT EXISTS form_submissions_org_house_submitted_idx
  ON form_submissions (org_id, house_id, submitted_at);

ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_submissions_select" ON form_submissions;
DROP POLICY IF EXISTS "form_submissions_insert" ON form_submissions;
DROP POLICY IF EXISTS "form_submissions_update" ON form_submissions;
DROP POLICY IF EXISTS "form_submissions_delete" ON form_submissions;

CREATE POLICY "form_submissions_select" ON form_submissions FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Any role in scope may submit a filled-out form.
CREATE POLICY "form_submissions_insert" ON form_submissions FOR INSERT WITH CHECK (
  org_id = auth_org_id()
);
-- Only managers/supervisors review (mark reviewed) submissions.
CREATE POLICY "form_submissions_update" ON form_submissions FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "form_submissions_delete" ON form_submissions FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
