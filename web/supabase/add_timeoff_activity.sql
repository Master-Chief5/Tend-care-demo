-- ============================================================================
-- Tend Care — TIME OFF requests  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql, add_timeclock.sql.
--
-- Adds one table:
--   • time_off_requests — staff-submitted vacation / sick / personal / unpaid
--                         time-off requests (pending → approved/rejected by a
--                         manager or supervisor)
--
-- (The Activity feed feature adds NO table — it is a pure aggregation in the app
-- layer over time_punches, shift_edit_requests and time_off_requests.)
--
-- RLS mirrors shift_edit_requests exactly (house-scoping model already in use):
--   • supervisor → full org access
--   • manager / DSP → own house (plus org-wide rows where house_id IS NULL)
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── time_off_requests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_off_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name       text,
  kind             text NOT NULL DEFAULT 'vacation',   -- vacation | sick | personal | unpaid
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  hours            numeric,                              -- optional total hours (nullable)
  reason           text,
  status           text NOT NULL DEFAULT 'pending',     -- pending | approved | rejected
  decided_by_name  text,
  decided_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_off_requests_org_house_created_idx
  ON time_off_requests (org_id, house_id, created_at);

ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_off_requests_select" ON time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_insert" ON time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_update" ON time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_delete" ON time_off_requests;

CREATE POLICY "time_off_requests_select" ON time_off_requests FOR SELECT USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "time_off_requests_insert" ON time_off_requests FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
);
-- Only managers/supervisors approve or reject.
CREATE POLICY "time_off_requests_update" ON time_off_requests FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "time_off_requests_delete" ON time_off_requests FOR DELETE USING (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR auth_staff_role() IN ('supervisor','manager'))
);
