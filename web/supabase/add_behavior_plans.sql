-- ============================================================================
-- Tend Care — BEHAVIOR SUPPORT PLANS (BSP) + structured ABC data  (additive)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds two tables backing a resident behavior-support feature:
--   • behavior_plans  — the per-resident behavior support plan: target
--                       behaviors plus the staff playbook (antecedent
--                       strategies, replacement behaviors, intervention steps).
--   • behavior_events — structured ABC data points (one row per occurrence),
--                       used to drive the per-target-behavior frequency chart.
--
-- RLS mirrors the events / house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house
--   • only managers/supervisors create / edit / delete PLANS
--   • any staff in scope may log an ABC behavior_event (front-line data entry)
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: tables use IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── behavior_plans ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS behavior_plans (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id               uuid REFERENCES houses(id) ON DELETE SET NULL,
  resident_id            uuid REFERENCES residents(id) ON DELETE CASCADE,
  resident_name          text,
  target_behaviors       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of behavior labels
  antecedent_strategies  text,
  replacement_behaviors  text,
  intervention_steps     text,
  created_by_name        text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS behavior_plans_org_house_idx
  ON behavior_plans (org_id, house_id);
CREATE INDEX IF NOT EXISTS behavior_plans_resident_idx
  ON behavior_plans (resident_id);

ALTER TABLE behavior_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "behavior_plans_select" ON behavior_plans;
DROP POLICY IF EXISTS "behavior_plans_insert" ON behavior_plans;
DROP POLICY IF EXISTS "behavior_plans_update" ON behavior_plans;
DROP POLICY IF EXISTS "behavior_plans_delete" ON behavior_plans;

CREATE POLICY "behavior_plans_select" ON behavior_plans FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only managers/supervisors create / edit / delete plans.
CREATE POLICY "behavior_plans_insert" ON behavior_plans FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "behavior_plans_update" ON behavior_plans FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "behavior_plans_delete" ON behavior_plans FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);

-- ── behavior_events (structured ABC data points) ─────────────────────────────
CREATE TABLE IF NOT EXISTS behavior_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id      uuid REFERENCES houses(id) ON DELETE SET NULL,
  resident_id   uuid REFERENCES residents(id) ON DELETE CASCADE,
  plan_id       uuid REFERENCES behavior_plans(id) ON DELETE SET NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  antecedent    text,
  behavior      text,                 -- which target behavior (drives the chart)
  consequence   text,
  intervention  text,
  intensity     text,                 -- Mild | Moderate | Severe
  recorded_by   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS behavior_events_resident_at_idx
  ON behavior_events (resident_id, occurred_at);
CREATE INDEX IF NOT EXISTS behavior_events_plan_idx
  ON behavior_events (plan_id);

ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "behavior_events_select" ON behavior_events;
DROP POLICY IF EXISTS "behavior_events_insert" ON behavior_events;
DROP POLICY IF EXISTS "behavior_events_delete" ON behavior_events;

CREATE POLICY "behavior_events_select" ON behavior_events FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Any staff in scope may log an ABC data point (front-line data entry).
CREATE POLICY "behavior_events_insert" ON behavior_events FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "behavior_events_delete" ON behavior_events FOR DELETE USING (
  org_id = auth_org_id()
  AND (auth_staff_role() IN ('supervisor','manager') OR house_id = auth_house_id())
);
