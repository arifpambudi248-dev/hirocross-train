-- Allow athletes to see coach roles (so they can find coaches to join)
CREATE POLICY "Athletes can view coach roles"
ON public.user_roles
FOR SELECT
USING (role = 'coach'::app_role);

-- Allow athletes to see coach profiles (so they can find coaches to join)
CREATE POLICY "Athletes can view coach profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'coach'::app_role
  )
);