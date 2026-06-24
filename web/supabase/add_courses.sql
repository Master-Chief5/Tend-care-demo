-- ============================================================================
-- Tend Care — COURSES / TRAINING with completion tracking  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds two tables backing a lightweight "Training" module:
--   • courses             — an assignable training course (org-wide or house-
--                           scoped) with ordered sections and an optional quiz,
--                           optionally flagged required and/or limited to roles.
--   • course_completions  — per-staff completion records (one per staff per
--                           course) with the quiz score and a timestamp.
--
-- RLS mirrors the house-scoping model already in use (see add_announcements.sql):
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house, further narrowed
--     by assign_roles when set.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: tables use IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── courses ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide "All staff"
  title            text NOT NULL,
  description      text,
  sections         jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{title, body}]
  quiz             jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{q, options[], answer}]
  required         boolean NOT NULL DEFAULT false,
  assign_roles     text[],               -- NULL/empty = everyone; else only these roles
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courses_org_house_created_idx
  ON courses (org_id, house_id, created_at);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select" ON courses;
DROP POLICY IF EXISTS "courses_insert" ON courses;
DROP POLICY IF EXISTS "courses_update" ON courses;
DROP POLICY IF EXISTS "courses_delete" ON courses;

CREATE POLICY "courses_select" ON courses FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
  AND (assign_roles IS NULL OR cardinality(assign_roles) = 0 OR auth_staff_role() = ANY(assign_roles))
);
-- Only managers/supervisors author courses.
CREATE POLICY "courses_insert" ON courses FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "courses_update" ON courses FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "courses_delete" ON courses FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);

-- ── course_completions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_completions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id        uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name       text,
  score            int,
  completed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, staff_id)
);

CREATE INDEX IF NOT EXISTS course_completions_org_course_idx
  ON course_completions (org_id, course_id);

ALTER TABLE course_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_completions_select" ON course_completions;
DROP POLICY IF EXISTS "course_completions_insert" ON course_completions;
DROP POLICY IF EXISTS "course_completions_update" ON course_completions;
DROP POLICY IF EXISTS "course_completions_delete" ON course_completions;

-- Admins see the whole org roll-up; non-admins see only their own completions.
CREATE POLICY "course_completions_select" ON course_completions FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() IN ('supervisor','manager') OR staff_id = auth_staff_id())
);
CREATE POLICY "course_completions_insert" ON course_completions FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
);
-- Allow re-completing (updates the score / timestamp on conflict).
CREATE POLICY "course_completions_update" ON course_completions FOR UPDATE USING (
  org_id = auth_org_id() AND staff_id = auth_staff_id()
) WITH CHECK (
  org_id = auth_org_id() AND staff_id = auth_staff_id()
);
CREATE POLICY "course_completions_delete" ON course_completions FOR DELETE USING (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR auth_staff_role() IN ('supervisor','manager'))
);
