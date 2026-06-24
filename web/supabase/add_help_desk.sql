-- ============================================================================
-- Tend Care — HELP DESK / ticketing  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds one table backing an internal Help Desk / ticketing module (HR, payroll,
-- IT, maintenance, scheduling, urgent on-shift issues):
--   • tickets — a request raised by a staff member (org-wide or house-scoped),
--               with a topic, priority, status, and optional assignee.
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house; a DSP also ALWAYS
--     sees the tickets they created.
--   • any role may open a ticket; only supervisor/manager may update one
--     (change status, set assignee).
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── tickets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id             uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide
  topic                text,                 -- hr | payroll | it | maintenance | scheduling | other
  subject              text NOT NULL,
  body                 text,
  status               text NOT NULL DEFAULT 'open',    -- open | in_progress | resolved
  priority             text NOT NULL DEFAULT 'med',     -- low | med | high
  created_by_name      text,
  created_by_staff_id  uuid REFERENCES staff(id) ON DELETE SET NULL,
  assigned_to_name     text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_org_house_created_idx
  ON tickets (org_id, house_id, created_at);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select" ON tickets;
DROP POLICY IF EXISTS "tickets_insert" ON tickets;
DROP POLICY IF EXISTS "tickets_update" ON tickets;
DROP POLICY IF EXISTS "tickets_delete" ON tickets;

-- Standard house scope, plus a DSP always sees tickets they created.
CREATE POLICY "tickets_select" ON tickets FOR SELECT USING (
  org_id = auth_org_id()
  AND (
    auth_staff_role() = 'supervisor'
    OR house_id IS NULL
    OR house_id = auth_house_id()
    OR created_by_staff_id = auth_staff_id()
  )
);
-- Any role may open a ticket.
CREATE POLICY "tickets_insert" ON tickets FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND (created_by_staff_id = auth_staff_id() OR created_by_staff_id IS NULL)
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only managers/supervisors triage (change status, set assignee).
CREATE POLICY "tickets_update" ON tickets FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "tickets_delete" ON tickets FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() = 'supervisor'
);
