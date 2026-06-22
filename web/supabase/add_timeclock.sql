-- ============================================================================
-- Tend Care — TIME CLOCK + TIMESHEETS + APPROVALS  (additive; idempotent)
-- Run AFTER security_critical.sql and security_house_scoping.sql.
--
-- Adds two tables:
--   • time_punches        — one row per clock-in/clock-out (open = active)
--   • shift_edit_requests — staff-submitted timesheet corrections (pending →
--                           approved/rejected by a manager or supervisor)
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → own house (plus org-wide rows where house_id IS NULL)
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: tables use IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── time_punches ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_punches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name       text,
  role             text,
  shift_id         uuid REFERENCES shifts(id) ON DELETE SET NULL,
  clock_in_at      timestamptz NOT NULL DEFAULT now(),
  clock_out_at     timestamptz,            -- null = still clocked in (active)
  in_lat           numeric,
  in_lng           numeric,
  out_lat          numeric,
  out_lng          numeric,
  paid_break_min   int NOT NULL DEFAULT 0,
  unpaid_break_min int NOT NULL DEFAULT 0,
  auto_closed      boolean NOT NULL DEFAULT false,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_punches_org_house_in_idx
  ON time_punches (org_id, house_id, clock_in_at);

ALTER TABLE time_punches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_punches_select" ON time_punches;
DROP POLICY IF EXISTS "time_punches_insert" ON time_punches;
DROP POLICY IF EXISTS "time_punches_update" ON time_punches;
DROP POLICY IF EXISTS "time_punches_delete" ON time_punches;

CREATE POLICY "time_punches_select" ON time_punches FOR SELECT USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "time_punches_insert" ON time_punches FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
);
CREATE POLICY "time_punches_update" ON time_punches FOR UPDATE USING (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR auth_staff_role() IN ('supervisor','manager'))
) WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR auth_staff_role() IN ('supervisor','manager'))
);
CREATE POLICY "time_punches_delete" ON time_punches FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);

-- ── shift_edit_requests ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_edit_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name       text,
  target_date      date NOT NULL,
  requested_in     timestamptz,
  requested_out    timestamptz,
  reason           text,
  status           text NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  decided_by_name  text,
  decided_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shift_edit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shift_edit_requests_select" ON shift_edit_requests;
DROP POLICY IF EXISTS "shift_edit_requests_insert" ON shift_edit_requests;
DROP POLICY IF EXISTS "shift_edit_requests_update" ON shift_edit_requests;
DROP POLICY IF EXISTS "shift_edit_requests_delete" ON shift_edit_requests;

CREATE POLICY "shift_edit_requests_select" ON shift_edit_requests FOR SELECT USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "shift_edit_requests_insert" ON shift_edit_requests FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
);
-- Only managers/supervisors approve or reject.
CREATE POLICY "shift_edit_requests_update" ON shift_edit_requests FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "shift_edit_requests_delete" ON shift_edit_requests FOR DELETE USING (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR auth_staff_role() IN ('supervisor','manager'))
);
