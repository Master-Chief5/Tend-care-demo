-- ============================================================================
-- Tend Care — SURVEYS  (staff pulse / training feedback; additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql, add_announcements.sql.
--
-- Adds two tables backing a lightweight "Surveys" module:
--   • surveys           — a survey (org-wide or house-scoped) with a jsonb list
--                         of typed questions, an optional anonymity flag, and an
--                         active / closed lifecycle status.
--   • survey_responses  — one response per staff per survey (jsonb answers).
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house.
--   • only supervisors / managers create, update (close), or delete surveys.
--   • responses are org-readable (so admins can tally) and staff insert their own.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: tables use IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── surveys ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surveys (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide "All staff"
  title            text NOT NULL,
  questions        jsonb NOT NULL DEFAULT '[]'::jsonb,              -- [{q, type:'multiple'|'rating'|'yesno'|'text', options}]
  anonymous        boolean NOT NULL DEFAULT false,
  created_by_name  text,
  status           text NOT NULL DEFAULT 'active',                 -- 'active' | 'closed'
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS surveys_org_house_created_idx
  ON surveys (org_id, house_id, created_at);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "surveys_select" ON surveys;
DROP POLICY IF EXISTS "surveys_insert" ON surveys;
DROP POLICY IF EXISTS "surveys_update" ON surveys;
DROP POLICY IF EXISTS "surveys_delete" ON surveys;

CREATE POLICY "surveys_select" ON surveys FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only managers/supervisors create surveys.
CREATE POLICY "surveys_insert" ON surveys FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "surveys_update" ON surveys FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "surveys_delete" ON surveys FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);

-- ── survey_responses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  survey_id        uuid REFERENCES surveys(id) ON DELETE CASCADE,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  answers          jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, staff_id)
);

CREATE INDEX IF NOT EXISTS survey_responses_survey_idx
  ON survey_responses (survey_id);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey_responses_select" ON survey_responses;
DROP POLICY IF EXISTS "survey_responses_insert" ON survey_responses;
DROP POLICY IF EXISTS "survey_responses_delete" ON survey_responses;

-- Admins tally results; non-admins see only their own responses.
CREATE POLICY "survey_responses_select" ON survey_responses FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() IN ('supervisor','manager') OR staff_id = auth_staff_id())
);
CREATE POLICY "survey_responses_insert" ON survey_responses FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
);
CREATE POLICY "survey_responses_delete" ON survey_responses FOR DELETE USING (
  org_id = auth_org_id() AND staff_id = auth_staff_id()
);

-- ── enforce anonymity at the DB ──────────────────────────────────────────────
-- When the parent survey is flagged anonymous, strip staff_id on insert so a
-- respondent can never be linked to their answers (defense in depth — the app
-- already omits it, but RLS-permitted inserts must not be able to override this).
CREATE OR REPLACE FUNCTION survey_responses_enforce_anonymity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM surveys s WHERE s.id = NEW.survey_id AND s.anonymous = true) THEN
    NEW.staff_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS survey_responses_anonymity ON survey_responses;
CREATE TRIGGER survey_responses_anonymity
  BEFORE INSERT ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION survey_responses_enforce_anonymity();
