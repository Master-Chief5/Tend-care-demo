-- ============================================================================
-- Tend Care — CRITICAL security fixes  (safe to apply now; idempotent)
-- Run in: Supabase Dashboard → SQL Editor → New query.
--
-- This file fixes the highest-severity issues WITHOUT changing who-sees-what at
-- the house level (that behavioural change lives in security_house_scoping.sql,
-- which you should apply after testing with a manager/DSP account). What's here:
--   1. Cross-tenant routing bug — patched in ALL identity functions (was only
--      fixed in auth_org_id). Adds auth_house_id() for later house scoping.
--   2. Staff table lockdown — a staff member can no longer promote themselves to
--      supervisor, move/delete colleagues, or spoof another person's row.
--   3. Missing UPDATE/DELETE policies on residents & vehicles — edits/deletes
--      that previously failed silently now work (still org-scoped here).
--   4. Team chat `messages` table (+ RLS) so chat works against the real backend.
--   5. One-active-trip-per-driver DB backstop (partial unique index).
--   6. Drop the brittle purpose/status CHECK constraints (fold of the fix_*.sql).
-- ============================================================================

-- 1. ── Identity functions: prefer the linked row; never sort NULL ahead ──────
CREATE OR REPLACE FUNCTION public.auth_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT org_id FROM staff
  WHERE auth_user_id = auth.uid()
     OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ORDER BY (auth_user_id = auth.uid()) DESC NULLS LAST
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.auth_staff_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT id FROM staff
  WHERE auth_user_id = auth.uid()
     OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ORDER BY (auth_user_id = auth.uid()) DESC NULLS LAST
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.auth_staff_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT role FROM staff
  WHERE auth_user_id = auth.uid()
     OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ORDER BY (auth_user_id = auth.uid()) DESC NULLS LAST
  LIMIT 1
$$;

-- House the caller is assigned to (NULL for supervisors / unassigned).
CREATE OR REPLACE FUNCTION public.auth_house_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT house_id FROM staff
  WHERE auth_user_id = auth.uid()
     OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ORDER BY (auth_user_id = auth.uid()) DESC NULLS LAST
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_staff_profile()
RETURNS TABLE(staff_id uuid, org_id uuid, house_id uuid, house_slug text, role text, staff_name text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
  SELECT s.id, s.org_id, s.house_id, h.slug, s.role, s.name
  FROM staff s
  LEFT JOIN houses h ON h.id = s.house_id
  WHERE s.auth_user_id = auth.uid()
     OR s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ORDER BY (s.auth_user_id = auth.uid()) DESC NULLS LAST
  LIMIT 1
$$;

-- 2. ── Staff table lockdown ─────────────────────────────────────────────────
-- Replace the over-broad "any org member can write any staff row" policies.
DROP POLICY IF EXISTS "staff_self_link"     ON staff;
DROP POLICY IF EXISTS "staff_update_manager" ON staff;
DROP POLICY IF EXISTS "staff_update"        ON staff;
DROP POLICY IF EXISTS "staff_insert"        ON staff;
DROP POLICY IF EXISTS "staff_delete"        ON staff;

-- Single UPDATE policy (one policy, so permissive OR-combining can't open a
-- back door): supervisors edit anyone in the org; managers edit staff in their
-- own house but can never mint a supervisor; anyone may update their OWN row but
-- not change their role, house, or org (so location/on-duty/name still work,
-- while privilege escalation and location spoofing are blocked).
CREATE POLICY "staff_update" ON staff FOR UPDATE
  USING (
    id = auth_staff_id()
    OR auth_staff_role() = 'supervisor'
    OR (auth_staff_role() = 'manager' AND house_id = auth_house_id())
    OR email = auth.email()                      -- first-login self-link bootstrap
  )
  WITH CHECK (
    org_id = auth_org_id()
    AND (
      auth_staff_role() = 'supervisor'
      OR (auth_staff_role() = 'manager' AND house_id = auth_house_id() AND role IN ('staff','manager'))
      OR (id = auth_staff_id() AND role = auth_staff_role() AND house_id IS NOT DISTINCT FROM auth_house_id())
      OR (email = auth.email() AND role = auth_staff_role() AND house_id IS NOT DISTINCT FROM auth_house_id())
    )
  );

-- INSERT: only supervisors (any house) or managers (their own house).
-- Signup paths use SECURITY DEFINER RPCs, so they are unaffected.
CREATE POLICY "staff_insert" ON staff FOR INSERT
  WITH CHECK (
    org_id = auth_org_id()
    AND (
      auth_staff_role() = 'supervisor'
      OR (auth_staff_role() = 'manager' AND house_id = auth_house_id())
    )
  );

-- DELETE: supervisors (any) or managers (their own house).
CREATE POLICY "staff_delete" ON staff FOR DELETE
  USING (
    org_id = auth_org_id()
    AND (
      auth_staff_role() = 'supervisor'
      OR (auth_staff_role() = 'manager' AND house_id = auth_house_id())
    )
  );

-- 3. ── Missing residents/vehicles UPDATE+DELETE (org-scoped here) ───────────
DROP POLICY IF EXISTS "residents_update" ON residents;
DROP POLICY IF EXISTS "residents_delete" ON residents;
DROP POLICY IF EXISTS "vehicles_update"  ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete"  ON vehicles;
CREATE POLICY "residents_update" ON residents FOR UPDATE USING (org_id = auth_org_id()) WITH CHECK (org_id = auth_org_id());
CREATE POLICY "residents_delete" ON residents FOR DELETE USING (org_id = auth_org_id());
CREATE POLICY "vehicles_update"  ON vehicles  FOR UPDATE USING (org_id = auth_org_id()) WITH CHECK (org_id = auth_org_id());
CREATE POLICY "vehicles_delete"  ON vehicles  FOR DELETE USING (org_id = auth_org_id());

-- 4. ── Team chat: messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  house_id        uuid REFERENCES public.houses(id) ON DELETE CASCADE,  -- NULL = org-wide "All staff"
  author_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  author_name     text,
  author_role     text,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_org_house ON public.messages (org_id, house_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (org_id = auth_org_id());
-- You can only post as yourself (author_staff_id must be you, or unset).
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (org_id = auth_org_id() AND (author_staff_id = auth_staff_id() OR author_staff_id IS NULL));
-- Authors can delete their own messages; supervisors can moderate.
CREATE POLICY "messages_delete" ON messages FOR DELETE
  USING (org_id = auth_org_id() AND (author_staff_id = auth_staff_id() OR auth_staff_role() = 'supervisor'));

-- 5. ── One active trip per driver (DB backstop for the client guard) ─────────
CREATE UNIQUE INDEX IF NOT EXISTS trips_one_active_per_driver
  ON public.trips (driver_id) WHERE status = 'active' AND driver_id IS NOT NULL;

-- 6. ── Drop brittle CHECK constraints (purpose / resident status are free-form
--       UI labels; folding fix_trips_purpose_check.sql + fix_residents_status_check.sql)
ALTER TABLE public.trips     DROP CONSTRAINT IF EXISTS trips_purpose_check;
ALTER TABLE public.residents DROP CONSTRAINT IF EXISTS residents_status_check;
