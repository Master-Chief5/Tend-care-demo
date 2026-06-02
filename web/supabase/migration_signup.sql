-- ── Signup migration ─────────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (or add to your seed.sql).
-- Adds two SECURITY DEFINER functions needed for the self-service sign-up flow.

-- 1. Public org search — callable by unauthenticated (anon) users so they can
--    find their organization before creating an account.
CREATE OR REPLACE FUNCTION search_organizations(query text)
RETURNS TABLE(id uuid, name text, slug text)
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT id, name, slug
  FROM organizations
  WHERE name  ILIKE '%' || query || '%'
     OR slug  ILIKE '%' || query || '%'
  ORDER BY name
  LIMIT 10
$$;

GRANT EXECUTE ON FUNCTION search_organizations(text) TO anon;
GRANT EXECUTE ON FUNCTION search_organizations(text) TO authenticated;

-- 2. Self-registration — called by a newly signed-up (authenticated) user to
--    create their staff profile and link it to their Supabase auth account.
--    ON CONFLICT: if a supervisor already pre-created a row with this email,
--    just link auth_user_id and preserve the supervisor-set name/role/house.
CREATE OR REPLACE FUNCTION register_as_staff(p_org_id uuid, p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email    text;
  v_staff_id uuid;
BEGIN
  v_email := (SELECT email FROM auth.users WHERE id = auth.uid());

  INSERT INTO staff (org_id, name, email, auth_user_id, role)
  VALUES (p_org_id, p_name, v_email, auth.uid(), 'staff')
  ON CONFLICT (org_id, email) DO UPDATE
    SET auth_user_id = auth.uid(),
        name = CASE
          WHEN staff.name = '' OR staff.name IS NULL THEN EXCLUDED.name
          ELSE staff.name
        END
  RETURNING id INTO v_staff_id;

  RETURN v_staff_id;
END;
$$;

GRANT EXECUTE ON FUNCTION register_as_staff(uuid, text) TO authenticated;

-- 3. Supervisor self-onboarding — creates a brand-new organization and registers
--    the caller as its supervisor in one atomic transaction.
--    Handles slug conflicts by appending -1, -2, etc.
CREATE OR REPLACE FUNCTION create_org_and_supervisor(
  p_org_name text,
  p_org_slug text,
  p_name     text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id  uuid;
  v_email   text;
  v_slug    text;
  v_attempt int := 0;
BEGIN
  v_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  v_slug  := p_org_slug;

  LOOP
    BEGIN
      INSERT INTO organizations (name, slug, subscription_tier)
      VALUES (p_org_name, v_slug, 'free')
      RETURNING id INTO v_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      v_slug := p_org_slug || '-' || v_attempt;
      IF v_attempt > 20 THEN RAISE; END IF;
    END;
  END LOOP;

  INSERT INTO staff (org_id, name, email, auth_user_id, role)
  VALUES (v_org_id, p_name, v_email, auth.uid(), 'supervisor');

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_org_and_supervisor(text, text, text) TO authenticated;
