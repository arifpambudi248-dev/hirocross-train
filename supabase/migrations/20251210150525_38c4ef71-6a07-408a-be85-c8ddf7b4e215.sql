-- Allow coaches to view all user roles (needed to find athletes)
CREATE POLICY "Coaches can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'coach'::app_role));