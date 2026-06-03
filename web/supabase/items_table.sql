-- Shared, house-scoped to-do/item log that both supervisors and workers see.
-- Applied live as migration create_items_table.
--   for_role = who must act: 'staff' (the house team) or 'supervisor' (the boss).
-- Tracks who created each item (+ their role) and who completed it.
CREATE TABLE IF NOT EXISTS public.items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  house_id        uuid REFERENCES public.houses(id) ON DELETE CASCADE,
  text            text NOT NULL,
  kind            text NOT NULL DEFAULT 'task',     -- task | supply | note
  for_role        text NOT NULL DEFAULT 'staff',    -- 'staff' | 'supervisor'
  created_by_name text,
  created_by_role text,
  status          text NOT NULL DEFAULT 'open',     -- open | done
  done_by_name    text,
  done_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_select ON public.items FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY items_insert ON public.items FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY items_update ON public.items FOR UPDATE USING (org_id = auth_org_id()) WITH CHECK (org_id = auth_org_id());
CREATE POLICY items_delete ON public.items FOR DELETE USING (org_id = auth_org_id());

CREATE INDEX IF NOT EXISTS idx_items_org_id   ON public.items (org_id);
CREATE INDEX IF NOT EXISTS idx_items_house_id ON public.items (house_id);
