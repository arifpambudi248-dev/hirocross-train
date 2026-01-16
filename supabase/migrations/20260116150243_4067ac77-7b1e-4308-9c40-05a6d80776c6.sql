-- Fix profiles table public exposure
-- Drop overly permissive search policies that allow viewing profiles without relationships
DROP POLICY IF EXISTS "Athletes can view coach basic profiles for search" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view athlete basic profiles for search" ON public.profiles;

-- Create more restrictive policies that only allow viewing profiles when there's a relationship
-- Athletes can view coach profiles ONLY if they have a pending or accepted relationship with that coach
CREATE POLICY "Athletes can view related coach profiles for search"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'athlete'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id AND ur.role = 'coach'::app_role
  )
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.athlete_id = auth.uid() 
    AND ca.coach_id = profiles.id
  )
);

-- Coaches can view athlete profiles ONLY if they have a pending or accepted relationship with that athlete
CREATE POLICY "Coaches can view related athlete profiles for search"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id AND ur.role = 'athlete'::app_role
  )
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.coach_id = auth.uid()
    AND ca.athlete_id = profiles.id
  )
);

-- Fix user_roles table public exposure
-- Drop the overly permissive policy that allows any authenticated user to see coach roles
DROP POLICY IF EXISTS "Authenticated users can view coach roles" ON public.user_roles;

-- Create a more restrictive policy: users can only see roles of users they have a direct relationship with
-- Athletes can see roles of their coaches (with pending or accepted relationship)
CREATE POLICY "Athletes can view their coaches roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'athlete'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.athlete_id = auth.uid()
    AND ca.coach_id = user_roles.user_id
  )
);

-- Coaches can see roles of their athletes (with pending or accepted relationship)
CREATE POLICY "Coaches can view their athletes roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.coach_id = auth.uid()
    AND ca.athlete_id = user_roles.user_id
  )
);