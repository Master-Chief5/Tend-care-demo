-- ============================================================
-- Tend Care — Phase 3 add_tables migration
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── New tables ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resources (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id   UUID        REFERENCES houses(id),
  name       TEXT        NOT NULL,
  qty        NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit       TEXT        NOT NULL DEFAULT 'units',
  cost       NUMERIC(10,2),
  week       DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id      UUID        REFERENCES houses(id),
  driver_id     UUID        REFERENCES staff(id),
  driver_name   TEXT        NOT NULL,
  resident_name TEXT        NOT NULL,
  destination   TEXT        NOT NULL,
  miles         NUMERIC(6,1) NOT NULL DEFAULT 0,
  purpose       TEXT        NOT NULL DEFAULT 'other'
                            CHECK (purpose IN ('medical','grocery','activity','other')),
  trip_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id     UUID        REFERENCES houses(id),
  name         TEXT        NOT NULL,
  plate        TEXT,
  mileage      INT,
  last_service DATE
);

CREATE TABLE IF NOT EXISTS residents (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id   UUID        REFERENCES houses(id),
  name       TEXT        NOT NULL,
  room       TEXT,
  dob        DATE,
  status     TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','inactive')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS for new tables ───────────────────────────────────────

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_select" ON resources;
DROP POLICY IF EXISTS "resources_insert" ON resources;
DROP POLICY IF EXISTS "resources_delete" ON resources;
DROP POLICY IF EXISTS "trips_select"     ON trips;
DROP POLICY IF EXISTS "trips_insert"     ON trips;
DROP POLICY IF EXISTS "vehicles_select"  ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert"  ON vehicles;
DROP POLICY IF EXISTS "residents_select" ON residents;
DROP POLICY IF EXISTS "residents_insert" ON residents;

CREATE POLICY "resources_select" ON resources FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "resources_insert" ON resources FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "resources_delete" ON resources FOR DELETE USING (org_id = auth_org_id());

CREATE POLICY "trips_select" ON trips FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "trips_insert" ON trips FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "vehicles_select" ON vehicles FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "residents_select" ON residents FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "residents_insert" ON residents FOR INSERT WITH CHECK (org_id = auth_org_id());

-- ── INSERT/UPDATE/DELETE policies for existing tables ────────

DROP POLICY IF EXISTS "shifts_insert"        ON shifts;
DROP POLICY IF EXISTS "tasks_insert"         ON tasks;
DROP POLICY IF EXISTS "houses_insert"        ON houses;
DROP POLICY IF EXISTS "houses_update"        ON houses;
DROP POLICY IF EXISTS "houses_delete"        ON houses;
DROP POLICY IF EXISTS "staff_insert"         ON staff;
DROP POLICY IF EXISTS "staff_update_manager" ON staff;
DROP POLICY IF EXISTS "staff_delete"         ON staff;

CREATE POLICY "shifts_insert" ON shifts FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "tasks_insert"  ON tasks  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "houses_insert" ON houses FOR INSERT
  WITH CHECK (org_id = auth_org_id());
CREATE POLICY "houses_update" ON houses FOR UPDATE
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());
CREATE POLICY "houses_delete" ON houses FOR DELETE
  USING (org_id = auth_org_id());

CREATE POLICY "staff_insert" ON staff FOR INSERT
  WITH CHECK (org_id = auth_org_id());
CREATE POLICY "staff_update_manager" ON staff FOR UPDATE
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());
CREATE POLICY "staff_delete" ON staff FOR DELETE
  USING (org_id = auth_org_id());

-- ── Seed: Vehicles for demo org ──────────────────────────────

INSERT INTO vehicles (org_id, house_id, name, plate, mileage)
SELECT
  'a1b2c3d4-0000-0000-0000-000000000001',
  h.id,
  v.vehicle_name,
  v.plate,
  v.mileage
FROM (VALUES
  ('oak',   'Oak Van',   'Ford Transit', 38402),
  ('cedar', 'Cedar SUV', 'Honda Pilot',  51108)
) AS v(house_slug, vehicle_name, plate, mileage)
JOIN houses h
  ON h.org_id = 'a1b2c3d4-0000-0000-0000-000000000001'
 AND h.slug = v.house_slug
ON CONFLICT DO NOTHING;
