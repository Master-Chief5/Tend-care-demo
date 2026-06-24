-- ============================================================================
-- Tend Care — MEDICAL APPOINTMENTS  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql, add_events.sql.
--
-- Adds one table backing a per-resident medical appointment tracker:
--   • appointments — a scheduled medical appointment for a resident, with a
--                    provider, type, reason, transport flag, status, and an
--                    outcome recorded once the visit is complete.
--
-- RLS mirrors the events / house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house
--   • only managers/supervisors create / edit / delete appointments
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_role(),
-- auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

CREATE TABLE IF NOT EXISTS appointments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id          uuid REFERENCES houses(id) ON DELETE SET NULL,
  resident_id       uuid REFERENCES residents(id) ON DELETE CASCADE,
  resident_name     text,
  appt_at           timestamptz,
  provider          text,
  type              text,                 -- dental | physical | psychiatry | vision | specialist | lab | other
  reason            text,
  status            text NOT NULL DEFAULT 'scheduled',   -- scheduled | completed
  outcome           text,
  transport_needed  boolean NOT NULL DEFAULT false,
  created_by_name   text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_org_house_at_idx
  ON appointments (org_id, house_id, appt_at);
CREATE INDEX IF NOT EXISTS appointments_resident_idx
  ON appointments (resident_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select" ON appointments;
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_update" ON appointments;
DROP POLICY IF EXISTS "appointments_delete" ON appointments;

CREATE POLICY "appointments_select" ON appointments FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only managers/supervisors create / edit / delete.
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "appointments_update" ON appointments FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "appointments_delete" ON appointments FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
