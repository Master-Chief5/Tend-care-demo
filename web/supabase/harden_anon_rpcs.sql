-- Block the `anon` (unauthenticated) role from calling sensitive SECURITY DEFINER
-- RPCs (org/house/staff creation, org search, and the "my" lookups). These are
-- only ever called by a signed-in user during onboarding/use, so authenticated
-- keeps EXECUTE. The auth_*() helpers are intentionally left alone: ~186 RLS
-- policies depend on them and they safely return null for anon. Idempotent.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.create_org_and_supervisor(text, text, text)',
    'public.create_house(text, text, text, text, text, text, text)',
    'public.register_as_staff(uuid, text)',
    'public.get_my_houses()',
    'public.get_my_staff_profile()'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end $$;

-- NOTE: search_organizations(text) is intentionally NOT in the list above — it
-- runs during signup BEFORE the staff member is authenticated (they search for
-- their org in the signup form while still `anon`), so it must stay anon-
-- callable. It returns only org name/id for the picker.
grant execute on function public.search_organizations(text) to anon;
