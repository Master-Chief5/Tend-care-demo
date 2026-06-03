-- ============================================================
-- Tend Care — fix cross-tenant routing in auth_org_id()
-- Run in: Supabase Dashboard → SQL Editor  (already applied to the live project
-- as migration `fix_auth_org_id_tenant_routing`).
--
-- Bug: auth_org_id() resolves the caller's org from their linked auth_user_id
-- OR (as a signup bootstrap fallback) their email. It intended to prefer the
-- linked row via `ORDER BY (auth_user_id = auth.uid()) DESC`, but `DESC` in
-- Postgres defaults to NULLS FIRST. When the same email also exists on an
-- *unlinked* staff row in another org (auth_user_id IS NULL), `(NULL = uid)` is
-- NULL and sorts ahead of the real match — so LIMIT 1 picked the WRONG org,
-- placing a user inside another tenant's data.
--
-- Fix: `DESC NULLS LAST` so the exact auth_user_id match always wins; the email
-- fallback still covers the legitimate pre-link bootstrap window. Also pins
-- search_path for this SECURITY DEFINER function (clears a linter warning).
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT org_id FROM staff
  WHERE auth_user_id = auth.uid()
     OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ORDER BY (auth_user_id = auth.uid()) DESC NULLS LAST
  LIMIT 1
$function$;
