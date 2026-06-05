-- ============================================================================
-- Tend Care — HOUSE / ROLE data isolation  (behavioural change; idempotent)
-- Run AFTER security_critical.sql, and after testing with a manager + DSP login.
--
-- Today every authenticated org member can read & write ALL of the org's data —
-- every resident's medical record, every house's logs, every staff member's live
-- GPS. This migration enforces the model the UI already implies:
--   • supervisor → full org access
--   • manager / DSP → only their assigned house (plus org-wide shared rows where
--     house_id IS NULL)
--
-- Depends on auth_house_id() / auth_staff_role() from security_critical.sql.
-- Re-runnable: every policy is dropped and recreated.
-- ============================================================================

-- ── House-scoped tables (org_id + house_id): standard 4 policies ─────────────
-- Visible/writable when: same org AND (you're a supervisor, OR the row is
-- org-wide (house_id IS NULL), OR the row belongs to your house).
DO $$
DECLARE
  t    text;
  tbls text[] := ARRAY[
    'residents','meds','med_administrations','prn_log','daily_log','incidents',
    'drills','goals','goal_data','health_logs','resources','trips','vehicles',
    'med_alerts','shift_notes','items','shifts'
  ];
  pred text := 'org_id = auth_org_id() AND (auth_staff_role() = ''supervisor'' OR house_id IS NULL OR house_id = auth_house_id())';
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (%s)',                t||'_select', t, pred);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s)',           t||'_insert', t, pred);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (%s) WITH CHECK (%s)', t||'_update', t, pred, pred);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (%s)',                t||'_delete', t, pred);
  END LOOP;
END $$;

-- ── staff: limit visibility to your house team (+ yourself); supervisors all ──
-- This is what stops a DSP from reading every colleague's live GPS across houses.
DROP POLICY IF EXISTS "staff_select" ON staff;
CREATE POLICY "staff_select" ON staff FOR SELECT USING (
  org_id = auth_org_id() AND (
    auth_staff_role() = 'supervisor'
    OR id = auth_staff_id()
    OR house_id = auth_house_id()
  )
);

-- ── tasks (no house_id; scoped via the assigned staff member's house) ────────
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  org_id = auth_org_id() AND (
    staff_id = auth_staff_id()
    OR auth_staff_role() = 'supervisor'
    OR (auth_staff_role() = 'manager' AND staff_id IN (SELECT id FROM staff WHERE house_id = auth_house_id()))
  )
);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (
    auth_staff_role() IN ('supervisor','manager') OR staff_id = auth_staff_id()
  )
);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  org_id = auth_org_id() AND (
    staff_id = auth_staff_id()
    OR auth_staff_role() = 'supervisor'
    OR (auth_staff_role() = 'manager' AND staff_id IN (SELECT id FROM staff WHERE house_id = auth_house_id()))
  )
) WITH CHECK (org_id = auth_org_id());
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  org_id = auth_org_id() AND (
    staff_id = auth_staff_id()
    OR auth_staff_role() = 'supervisor'
    OR (auth_staff_role() = 'manager' AND staff_id IN (SELECT id FROM staff WHERE house_id = auth_house_id()))
  )
);

-- ── houses: anyone in the org may READ house names (needed by joins/lookups),
--    but only supervisors create/delete, and managers may edit their own house
--    (e.g. geofence). house_select stays org-wide on purpose.
DROP POLICY IF EXISTS "houses_insert" ON houses;
DROP POLICY IF EXISTS "houses_update" ON houses;
DROP POLICY IF EXISTS "houses_delete" ON houses;
CREATE POLICY "houses_insert" ON houses FOR INSERT
  WITH CHECK (org_id = auth_org_id() AND auth_staff_role() = 'supervisor');
CREATE POLICY "houses_update" ON houses FOR UPDATE
  USING (org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR (auth_staff_role() = 'manager' AND id = auth_house_id())))
  WITH CHECK (org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR (auth_staff_role() = 'manager' AND id = auth_house_id())));
CREATE POLICY "houses_delete" ON houses FOR DELETE
  USING (org_id = auth_org_id() AND auth_staff_role() = 'supervisor');

-- ── messages: re-scope read/post to channel visibility ──────────────────────
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND (author_staff_id = auth_staff_id() OR author_staff_id IS NULL)
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
