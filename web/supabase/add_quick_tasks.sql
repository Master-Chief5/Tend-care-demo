-- ============================================================================
-- Tend Care — QUICK TASKS  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds one table backing a lightweight "Quick Tasks" module: assignable
-- one-off tasks with a due date — the "waiting for you" queue.
--   • quick_tasks — a task (org-wide or house-scoped) optionally assigned to a
--                   staff member, with a due date and an open/done status.
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house.
--   • anyone in scope may create a task and may update one (to complete /
--     reopen it); only managers/supervisors may delete.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── quick_tasks ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quick_tasks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id           uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide "All staff"
  title              text NOT NULL,
  notes              text,
  assigned_staff_id  uuid REFERENCES staff(id) ON DELETE SET NULL,
  assigned_name      text,
  due_at             timestamptz,
  status             text NOT NULL DEFAULT 'open',   -- 'open' | 'done'
  created_by_name    text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  done_at            timestamptz,
  done_by_name       text
);

CREATE INDEX IF NOT EXISTS quick_tasks_org_house_status_idx
  ON quick_tasks (org_id, house_id, status, due_at);

ALTER TABLE quick_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quick_tasks_select" ON quick_tasks;
DROP POLICY IF EXISTS "quick_tasks_insert" ON quick_tasks;
DROP POLICY IF EXISTS "quick_tasks_update" ON quick_tasks;
DROP POLICY IF EXISTS "quick_tasks_delete" ON quick_tasks;

CREATE POLICY "quick_tasks_select" ON quick_tasks FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Anyone in the org may create a task.
CREATE POLICY "quick_tasks_insert" ON quick_tasks FOR INSERT WITH CHECK (
  org_id = auth_org_id()
);
-- Anyone in scope may update a task (e.g. to complete or reopen it).
CREATE POLICY "quick_tasks_update" ON quick_tasks FOR UPDATE USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
) WITH CHECK (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only managers/supervisors may delete.
CREATE POLICY "quick_tasks_delete" ON quick_tasks FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
