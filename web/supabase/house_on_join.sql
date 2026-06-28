-- House-on-join — fixes the root cause where self-signup staff got house_id=NULL.
-- With a null house, auth_house_id() is null, so every house-scoped write
-- (incidents, daily log, clock-in read-back, shifts, items) fails the RLS check
-- `house_id = auth_house_id()` and 403s — while the old UI faked success.
--
-- Applied to project ztatmhxvvthlevddqqdl. Idempotent (create-or-replace + a new
-- 3-arg overload; the original 2-arg register_as_staff is left intact).

-- 1) Anon-callable house list for the signup picker (id/name/slug only).
create or replace function public.list_org_houses(p_org_id uuid)
returns table (id uuid, name text, slug text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, slug
  from houses
  where org_id = p_org_id
  order by name
$$;
revoke all on function public.list_org_houses(uuid) from public;
grant execute on function public.list_org_houses(uuid) to anon, authenticated, service_role;

-- 2) register_as_staff overload that accepts an optional house. Validates the
--    house belongs to the org; on re-register fills a MISSING house (an existing
--    assignment wins — a supervisor's placement is never overwritten). This also
--    lets an already-joined, house-less account self-heal from the app.
create or replace function public.register_as_staff(p_org_id uuid, p_name text, p_house_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text;
  v_staff_id uuid;
  v_house    uuid := p_house_id;
begin
  v_email := (select email from auth.users where id = auth.uid());

  if v_house is not null and not exists (
    select 1 from houses where id = v_house and org_id = p_org_id
  ) then
    v_house := null;
  end if;

  insert into staff (org_id, name, email, auth_user_id, role, house_id)
  values (p_org_id, p_name, v_email, auth.uid(), 'staff', v_house)
  on conflict (org_id, email) do update
    set auth_user_id = auth.uid(),
        house_id = coalesce(staff.house_id, excluded.house_id),
        name = case
          when staff.name = '' or staff.name is null then excluded.name
          else staff.name
        end
  returning id into v_staff_id;

  return v_staff_id;
end;
$$;
revoke all on function public.register_as_staff(uuid, text, uuid) from public, anon;
grant execute on function public.register_as_staff(uuid, text, uuid) to authenticated, service_role;
