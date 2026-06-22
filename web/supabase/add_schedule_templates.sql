-- ============================================================================
-- Tend Care — SCHEDULE TEMPLATES  (additive; idempotent)
-- Run AFTER security_critical.sql and security_house_scoping.sql.
--
-- Adds one table:
--   • schedule_templates — a saved day-of-week shift pattern that can be applied
--                          to any week (powers "save/apply week template"). Each
--                          row stores an array of template-shift objects in JSON:
--                          { dayIndex, startHour, endHour, role, personName,
--                            staffId, note } where dayIndex is 0-6 = the position
--                          within the displayed week.
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access (plus org-wide rows where house_id IS NULL)
--   • manager / DSP → own house (plus org-wide rows)
--   • only supervisors/managers create or delete templates
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_role(),
-- auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── schedule_templates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,
  name             text NOT NULL,
  shifts           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of template-shift objects
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schedule_templates_org_house_created_idx
  ON schedule_templates (org_id, house_id, created_at);

ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_templates_select" ON schedule_templates;
DROP POLICY IF EXISTS "schedule_templates_insert" ON schedule_templates;
DROP POLICY IF EXISTS "schedule_templates_delete" ON schedule_templates;

CREATE POLICY "schedule_templates_select" ON schedule_templates FOR SELECT USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "schedule_templates_insert" ON schedule_templates FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "schedule_templates_delete" ON schedule_templates FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
