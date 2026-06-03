-- Allow org members to edit and delete their own org's shifts.
-- (Originally shifts had only INSERT + SELECT policies, so edits/deletes were
-- silently blocked by RLS.) Applied live as migration shifts_update_delete_policies.
CREATE POLICY shifts_update ON public.shifts
  FOR UPDATE USING (org_id = auth_org_id()) WITH CHECK (org_id = auth_org_id());
CREATE POLICY shifts_delete ON public.shifts
  FOR DELETE USING (org_id = auth_org_id());
