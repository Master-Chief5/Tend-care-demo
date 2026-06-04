-- Meds (eMAR), daily log, incidents, drills + resident clinical fields + staff certs.
-- Applied to production via Supabase migration
-- "add_meds_log_compliance_resident_clinical_certs". Additive only — no existing
-- data is modified. RLS mirrors the existing tables (org_id = auth_org_id()).

alter table public.residents
  add column if not exists allergies text,
  add column if not exists diagnoses text,
  add column if not exists diet text,
  add column if not exists guardian text,
  add column if not exists physician text,
  add column if not exists flags text[] default '{}';

alter table public.staff add column if not exists certs jsonb default '[]'::jsonb;

create table if not exists public.meds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete cascade,
  name text not null, dose text, route text,
  times text[] default '{}', prn boolean default false, prn_reason text,
  prescriber text, active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.med_administrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete cascade,
  med_id uuid not null references public.meds(id) on delete cascade,
  admin_date date not null, slot text not null, status text,
  recorded_by text, recorded_at timestamptz default now(),
  unique (med_id, admin_date, slot)
);

create table if not exists public.prn_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete cascade,
  med_id uuid references public.meds(id) on delete cascade,
  resident text, med text, reason text, effect text,
  recorded_by text, log_date date default current_date,
  recorded_at timestamptz default now()
);

create table if not exists public.daily_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete set null,
  category text, body text not null, author_name text,
  log_date date default current_date, created_at timestamptz default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete set null,
  type text, severity text, narrative text not null, actions text, notified text,
  status text default 'open', reported_by text, incident_date date default current_date,
  reviewed_by text, reviewed_at timestamptz, created_at timestamptz default now()
);

create table if not exists public.drills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete cascade,
  type text, drill_date date default current_date, evac_time text, notes text,
  logged_by text, created_at timestamptz default now()
);

-- Covering indexes on org_id / house_id / FKs
create index if not exists meds_org_idx on public.meds(org_id);
create index if not exists meds_house_idx on public.meds(house_id);
create index if not exists meds_resident_idx on public.meds(resident_id);
create index if not exists medadmin_org_idx on public.med_administrations(org_id);
create index if not exists medadmin_med_idx on public.med_administrations(med_id);
create index if not exists medadmin_house_idx on public.med_administrations(house_id);
create index if not exists prnlog_org_idx on public.prn_log(org_id);
create index if not exists prnlog_house_idx on public.prn_log(house_id);
create index if not exists prnlog_med_idx on public.prn_log(med_id);
create index if not exists dailylog_org_idx on public.daily_log(org_id);
create index if not exists dailylog_house_idx on public.daily_log(house_id);
create index if not exists dailylog_resident_idx on public.daily_log(resident_id);
create index if not exists incidents_org_idx on public.incidents(org_id);
create index if not exists incidents_house_idx on public.incidents(house_id);
create index if not exists incidents_resident_idx on public.incidents(resident_id);
create index if not exists drills_org_idx on public.drills(org_id);
create index if not exists drills_house_idx on public.drills(house_id);

-- RLS: org-scoped select/insert/update/delete (mirrors existing tables)
do $$
declare t text;
begin
  foreach t in array array['meds','med_administrations','prn_log','daily_log','incidents','drills']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_select', t);
    execute format('drop policy if exists %I on public.%I', t||'_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_update', t);
    execute format('drop policy if exists %I on public.%I', t||'_delete', t);
    execute format('create policy %I on public.%I for select using (org_id = auth_org_id())', t||'_select', t);
    execute format('create policy %I on public.%I for insert with check (org_id = auth_org_id())', t||'_insert', t);
    execute format('create policy %I on public.%I for update using (org_id = auth_org_id()) with check (org_id = auth_org_id())', t||'_update', t);
    execute format('create policy %I on public.%I for delete using (org_id = auth_org_id())', t||'_delete', t);
  end loop;
end $$;
