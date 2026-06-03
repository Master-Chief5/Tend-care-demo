-- ── Server-side write functions ──────────────────────────────────────────
-- Run this in the Supabase SQL Editor.
--
-- Why this exists: client-side INSERTs depend on the table's RLS policy
-- (`org_id = auth_org_id()`) being present AND on the client passing the exact
-- org_id the policy expects. If the add_tables.sql migration errored partway,
-- or there's any org_id mismatch, the insert is silently rejected.
--
-- These SECURITY DEFINER functions remove that fragility: they compute the
-- caller's org from their authenticated identity and insert directly, bypassing
-- RLS. They are the same pattern already used by create_org_and_supervisor and
-- register_as_staff. Safe to re-run (CREATE OR REPLACE).

-- Fetch all houses for the caller's organization (bypasses RLS SELECT policy).
CREATE OR REPLACE FUNCTION get_my_houses()
RETURNS SETOF houses LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT * FROM houses WHERE org_id = auth_org_id() ORDER BY name;
$$;
GRANT EXECUTE ON FUNCTION get_my_houses() TO authenticated;

-- Create a house for the caller's organization.
CREATE OR REPLACE FUNCTION create_house(
  p_name         text,
  p_slug         text,
  p_short        text,
  p_address      text,
  p_branch       text,
  p_color        text,
  p_manager_name text
) RETURNS houses LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id  uuid;
  v_base    text;
  v_slug    text;
  v_attempt int := 0;
  v_row     houses;
BEGIN
  v_org_id := auth_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Your account is not linked to an organization';
  END IF;

  v_base := COALESCE(NULLIF(trim(p_slug), ''),
                     lower(regexp_replace(trim(p_name), '\s+', '-', 'g')));
  v_base := regexp_replace(v_base, '[^a-z0-9-]', '', 'g');
  IF v_base = '' THEN v_base := 'house'; END IF;
  v_slug := v_base;

  LOOP
    BEGIN
      INSERT INTO houses (org_id, slug, name, short, address, branch, color, manager_name, residents_count)
      VALUES (
        v_org_id,
        v_slug,
        p_name,
        COALESCE(NULLIF(trim(p_short), ''), upper(left(regexp_replace(p_name, '\s', '', 'g'), 3))),
        NULLIF(trim(p_address), ''),
        NULLIF(trim(p_branch), ''),
        COALESCE(NULLIF(trim(p_color), ''), '#888888'),
        NULLIF(trim(p_manager_name), ''),
        0
      )
      RETURNING * INTO v_row;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      v_slug := v_base || '-' || v_attempt;
      IF v_attempt > 50 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION create_house(text, text, text, text, text, text, text) TO authenticated;
