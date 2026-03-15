
-- Allow athletes to discover coaches by viewing coach roles in user_roles
CREATE POLICY "Athletes can discover coach roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'athlete'::app_role)
  AND role = 'coach'::app_role
);

-- Allow coaches to discover athlete roles in user_roles
CREATE POLICY "Coaches can discover athlete roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'coach'::app_role)
  AND role = 'athlete'::app_role
);

-- Allow athletes to discover coach profiles for search
CREATE POLICY "Athletes can discover coach profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'athlete'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
    AND ur.role = 'coach'::app_role
  )
);

-- Allow coaches to discover athlete profiles for search
CREATE POLICY "Coaches can discover athlete profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
    AND ur.role = 'athlete'::app_role
  )
);
