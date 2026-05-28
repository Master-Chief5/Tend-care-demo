-- ============================================================
-- Tend Care — Phase 3 database seed
-- Run ONCE in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  slug              TEXT        UNIQUE NOT NULL,
  subscription_tier TEXT        NOT NULL DEFAULT 'free'
                                CHECK (subscription_tier IN ('free', 'starter', 'pro')),
  config            JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS houses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug            TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  short           TEXT        NOT NULL,
  address         TEXT,
  branch          TEXT,
  color           TEXT        NOT NULL DEFAULT '#888888',
  manager_name    TEXT,
  residents_count INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

CREATE TABLE IF NOT EXISTS staff (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id      UUID        REFERENCES houses(id),
  auth_user_id  UUID        REFERENCES auth.users(id),
  name          TEXT        NOT NULL,
  email         TEXT,
  role          TEXT        NOT NULL DEFAULT 'staff'
                            CHECK (role IN ('supervisor', 'manager', 'staff')),
  quality_score INT         NOT NULL DEFAULT 85,
  tenure        TEXT,
  highlight     TEXT        CHECK (highlight IN ('promo', 'concern', 'orient') OR highlight IS NULL),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, email)
);

CREATE TABLE IF NOT EXISTS shifts (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id    UUID         NOT NULL REFERENCES houses(id),
  staff_id    UUID         REFERENCES staff(id),
  person_name TEXT         NOT NULL,
  role        TEXT         NOT NULL,
  start_hour  NUMERIC(5,2) NOT NULL,
  end_hour    NUMERIC(5,2) NOT NULL,
  status      TEXT         NOT NULL DEFAULT 'scheduled'
                           CHECK (status IN ('scheduled', 'here', 'late', 'swap', 'open')),
  shift_date  DATE         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id   UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  task_date  DATE        NOT NULL,
  kind       TEXT        NOT NULL DEFAULT 'note'
                         CHECK (kind IN ('med', 'drive', 'note', 'shop')),
  text       TEXT        NOT NULL,
  done       BOOLEAN     NOT NULL DEFAULT FALSE,
  urgent     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;

-- Returns org_id for the currently authenticated user
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT org_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- Returns staff id for the currently authenticated user
CREATE OR REPLACE FUNCTION auth_staff_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- Returns role for the currently authenticated user
CREATE OR REPLACE FUNCTION auth_staff_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role FROM staff WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- organizations: only see your own org
DROP POLICY IF EXISTS "org_select"         ON organizations;
DROP POLICY IF EXISTS "houses_select"      ON houses;
DROP POLICY IF EXISTS "staff_select"       ON staff;
DROP POLICY IF EXISTS "staff_self_link"    ON staff;
DROP POLICY IF EXISTS "shifts_select"      ON shifts;
DROP POLICY IF EXISTS "tasks_select"       ON tasks;
DROP POLICY IF EXISTS "tasks_update"       ON tasks;

CREATE POLICY "org_select"      ON organizations FOR SELECT USING (id = auth_org_id());
CREATE POLICY "houses_select"   ON houses        FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "staff_select"    ON staff         FOR SELECT USING (org_id = auth_org_id());

-- Allow a user to link their own auth_user_id on first login
CREATE POLICY "staff_self_link" ON staff FOR UPDATE
  USING    (email = auth.email())
  WITH CHECK (email = auth.email());

CREATE POLICY "shifts_select"   ON shifts FOR SELECT USING (org_id = auth_org_id());

-- Staff see only their own tasks; supervisors/managers see all in org
CREATE POLICY "tasks_select"    ON tasks  FOR SELECT
  USING (
    staff_id = auth_staff_id()
    OR auth_staff_role() IN ('supervisor', 'manager')
  );

-- Staff can check/uncheck their own tasks
CREATE POLICY "tasks_update"    ON tasks  FOR UPDATE
  USING (staff_id = auth_staff_id());

-- ── Seed: Organization ───────────────────────────────────────

INSERT INTO organizations (id, name, slug, subscription_tier)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Tend Care Demo',
  'tendcare-demo',
  'starter'
) ON CONFLICT (slug) DO NOTHING;

-- ── Seed: Houses ─────────────────────────────────────────────

INSERT INTO houses (org_id, slug, name, short, address, branch, color, manager_name, residents_count)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001','oak',   'Oak House',   'OAK','142 Oak Lane',    'North','#d4a64a','Aisha M.',4),
  ('a1b2c3d4-0000-0000-0000-000000000001','willow','Willow Run',  'WLW','318 Willow Ct',   'North','#2f9489','Devon P.',4),
  ('a1b2c3d4-0000-0000-0000-000000000001','maple', 'Maple Run',   'MPL','27 Maple Street', 'South','#cf4f3b','Saira K.',5),
  ('a1b2c3d4-0000-0000-0000-000000000001','cedar', 'Cedar Ridge', 'CDR','904 Cedar Road',  'South','#6e4d8f','Tomas R.',5)
ON CONFLICT (org_id, slug) DO NOTHING;

-- ── Seed: Staff (10 members) ──────────────────────────────────

INSERT INTO staff (org_id, house_id, name, email, role, quality_score, tenure, highlight, notes)
VALUES
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  NULL,
  'Lina Rodriguez','lina@tendcare.app','supervisor',99,'5.0 yrs',NULL,
  'Organization supervisor.'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM houses WHERE org_id='a1b2c3d4-0000-0000-0000-000000000001' AND slug='oak'),
  'Aisha Mendez','aisha@tendcare.app','staff',96,'2.1 yrs','promo',
  'Flagged for Lead promotion. Score above 92 for 24 days.'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM houses WHERE org_id='a1b2c3d4-0000-0000-0000-000000000001' AND slug='oak'),
  'Jay Brooks','jay@tendcare.app','staff',88,'2.0 yrs',NULL,
  'MAR compliance perfect last 90 days. Reliable 7a–3p.'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM houses WHERE org_id='a1b2c3d4-0000-0000-0000-000000000001' AND slug='willow'),
  'Devon Park','devon@tendcare.app','manager',94,'3.4 yrs',NULL,
  'Family satisfaction rating 5.0. No incidents this quarter.'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM houses WHERE org_id='a1b2c3d4-0000-0000-0000-000000000001' AND slug='maple'),
  'Saira Khan','saira@tendcare.app','manager',89,'1.2 yrs',NULL,
  'Consistent performance. Completed all trainings.'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM houses WHERE org_id='a1b2c3d4-0000-0000-0000-000000000001' AND slug='maple'),
  'Marcus Lewis','marcus@tendcare.app','staff',64,'0.5 yrs','concern',
  '4 late arrivals in past 2 weeks. Last note: tardy w/o notice.'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM houses WHERE org_id='a1b2c3d4-0000-0000-0000-000000000001' AND slug='oak'),
  'Carmen Vela','carmen@tendcare.app','staff',82,'6 mo','orient',
  'In orientation — 80% complete. Week 2 tasks pending.'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM houses WHERE org_id='a1b2c3d4-0000-0000-0000-000000000001' AND slug='cedar'),
  'Priya Nair','priya@tendcare.app','staff',91,'1.8 yrs',NULL,
  'Consistent lead on Cedar weekend shifts.'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM houses WHERE org_id='a1b2c3d4-0000-0000-0000-000000000001' AND slug='maple'),
  'Reni Tate','reni@tendcare.app','staff',87,'1.5 yrs',NULL,
  'Reliable on mid-day shift. Good resident rapport.'
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM houses WHERE org_id='a1b2c3d4-0000-0000-0000-000000000001' AND slug='cedar'),
  'Tomas Reed','tomas@tendcare.app','manager',93,'4.0 yrs',NULL,
  'Longest-tenured manager. No open incidents.'
)
ON CONFLICT (org_id, email) DO NOTHING;

-- ── Seed: Shifts for today ────────────────────────────────────

INSERT INTO shifts (org_id, house_id, person_name, role, start_hour, end_hour, status, shift_date)
SELECT
  'a1b2c3d4-0000-0000-0000-000000000001',
  h.id,
  v.person_name, v.role,
  v.start_hour::numeric, v.end_hour::numeric,
  v.status,
  CURRENT_DATE
FROM (VALUES
  ('oak',    'Aisha M.',  'Lead',      7.00, 15.00, 'here'),
  ('oak',    'Jay B.',    'DSP',       7.00, 15.00, 'here'),
  ('oak',    'Carmen V.', 'DSP',      15.00, 23.00, 'scheduled'),
  ('oak',    'Brian L.',  'Awake OT', 23.00, 31.00, 'scheduled'),
  ('willow', 'Devon P.',  'Mgr',       7.00, 15.00, 'here'),
  ('willow', 'OPEN',      'DSP',      15.00, 23.00, 'open'),
  ('willow', 'Theo W.',   'PT',        9.00, 13.00, 'scheduled'),
  ('maple',  'Saira K.',  'Mgr',       7.00, 15.00, 'here'),
  ('maple',  'Marcus L.', 'DSP',       7.20, 15.20, 'late'),
  ('maple',  'Reni T.',   'DSP',      11.00, 19.00, 'scheduled'),
  ('maple',  'Iris H.',   'DSP',      19.00, 27.00, 'scheduled'),
  ('cedar',  'Tomas R.',  'Mgr',       7.00, 15.00, 'here'),
  ('cedar',  'Priya N.',  'DSP',      15.00, 23.00, 'swap')
) AS v(house_slug, person_name, role, start_hour, end_hour, status)
JOIN houses h
  ON h.org_id = 'a1b2c3d4-0000-0000-0000-000000000001'
 AND h.slug = v.house_slug;

-- ── Seed: Tasks for Aisha (today) ────────────────────────────

INSERT INTO tasks (org_id, staff_id, task_date, kind, text, done, urgent)
SELECT
  'a1b2c3d4-0000-0000-0000-000000000001',
  (SELECT id FROM staff WHERE email = 'aisha@tendcare.app' AND org_id = 'a1b2c3d4-0000-0000-0000-000000000001'),
  CURRENT_DATE,
  v.kind, v.text, v.done::boolean, v.urgent::boolean
FROM (VALUES
  ('med',   'Morning meds — Ruth J., Marcus L., Tom R., Donna P.',  'true',  'false'),
  ('drive', '1:30pm — M. Lee to dentist (Dr. Patel, 14 Oak St)',    'false', 'true'),
  ('note',  'Document shift note before 3pm handoff',               'false', 'false'),
  ('shop',  'Grocery order — oat milk, bananas, dish soap',         'false', 'false'),
  ('med',   'Afternoon meds — Ruth J. 2pm (needs 2nd signoff)',     'false', 'true')
) AS v(kind, text, done, urgent);

-- ── Link existing auth users by email ────────────────────────
-- This runs after seed so auth users created before this point are linked.
-- Re-run this single UPDATE any time you add new auth users.

UPDATE staff
SET auth_user_id = au.id
FROM auth.users au
WHERE staff.email = au.email
  AND staff.auth_user_id IS NULL;
