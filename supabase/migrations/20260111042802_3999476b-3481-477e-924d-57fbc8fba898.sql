-- Allow admin to insert roles
DROP POLICY IF EXISTS "Prevent users from assigning roles" ON public.user_roles;
CREATE POLICY "Admin can assign roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admin to delete roles  
DROP POLICY IF EXISTS "Prevent role deletion" ON public.user_roles;
CREATE POLICY "Admin can delete roles"
ON public.user_roles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admin to update roles
DROP POLICY IF EXISTS "Prevent role updates" ON public.user_roles;
CREATE POLICY "Admin can update roles"
ON public.user_roles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
);