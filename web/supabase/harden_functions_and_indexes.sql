-- ============================================================
-- Tend Care — database hardening (already applied live as migrations
-- `harden_function_search_path` and `add_foreign_key_indexes`).
-- Run in Supabase SQL Editor if standing up a fresh project. Safe to re-run.
--
-- 1. Pin search_path on the SECURITY DEFINER functions (clears the
--    function_search_path_mutable security advisor; prevents search_path
--    hijacking). auth_org_id is handled in fix_auth_org_id.sql.
-- 2. Add covering indexes for every foreign key (clears the
--    unindexed_foreign_keys performance advisor; speeds up the org/house
--    scoped reads the app runs on every screen).
-- ============================================================

-- 1. Function search_path -------------------------------------------------
ALTER FUNCTION public.get_my_staff_profile()                       SET search_path = public, pg_temp;
ALTER FUNCTION public.auth_staff_id()                              SET search_path = public, pg_temp;
ALTER FUNCTION public.auth_staff_role()                            SET search_path = public, pg_temp;
ALTER FUNCTION public.search_organizations(query text)             SET search_path = public, pg_temp;
ALTER FUNCTION public.register_as_staff(p_org_id uuid, p_name text) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_org_and_supervisor(p_org_name text, p_org_slug text, p_name text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_houses()                              SET search_path = public, pg_temp;
ALTER FUNCTION public.create_house(p_name text, p_slug text, p_short text, p_address text, p_branch text, p_color text, p_manager_name text) SET search_path = public, pg_temp;

-- 2. Foreign-key covering indexes ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_med_alerts_house_id  ON public.med_alerts (house_id);
CREATE INDEX IF NOT EXISTS idx_residents_house_id   ON public.residents (house_id);
CREATE INDEX IF NOT EXISTS idx_residents_org_id     ON public.residents (org_id);
CREATE INDEX IF NOT EXISTS idx_resources_house_id   ON public.resources (house_id);
CREATE INDEX IF NOT EXISTS idx_resources_org_id     ON public.resources (org_id);
CREATE INDEX IF NOT EXISTS idx_shift_notes_house_id ON public.shift_notes (house_id);
CREATE INDEX IF NOT EXISTS idx_shifts_house_id      ON public.shifts (house_id);
CREATE INDEX IF NOT EXISTS idx_shifts_org_id        ON public.shifts (org_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id      ON public.shifts (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id   ON public.staff (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_house_id       ON public.staff (house_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id         ON public.tasks (org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_staff_id       ON public.tasks (staff_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id      ON public.trips (driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_house_id       ON public.trips (house_id);
CREATE INDEX IF NOT EXISTS idx_trips_org_id         ON public.trips (org_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_house_id    ON public.vehicles (house_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_id      ON public.vehicles (org_id);
