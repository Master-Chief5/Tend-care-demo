-- Live trip tracking: destination coords, worker's current location, arrival.
-- Applied to production via migrations add_trip_tracking_columns and
-- add_trip_live_location_columns. Additive only.

alter table public.trips
  add column if not exists status text default 'logged',
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists start_lat double precision,
  add column if not exists start_lng double precision,
  add column if not exists end_lat double precision,
  add column if not exists end_lng double precision,
  add column if not exists dest_lat double precision,
  add column if not exists dest_lng double precision,
  add column if not exists cur_lat double precision,
  add column if not exists cur_lng double precision,
  add column if not exists last_ping timestamptz,
  add column if not exists arrived_at timestamptz;

create index if not exists trips_status_idx on public.trips(org_id, status);
