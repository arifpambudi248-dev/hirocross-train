-- Fix: Ensure profiles table requires authentication for SELECT
-- First, let's check and update existing policies to require authentication

-- Drop and recreate the users viewing own profile policy with explicit auth check
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Drop and recreate coaches viewing athlete profiles with explicit auth check  
DROP POLICY IF EXISTS "Coaches can view their athletes profiles" ON public.profiles;
CREATE POLICY "Coaches can view their athletes profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.coach_athletes
    WHERE coach_id = auth.uid()
    AND athlete_id = profiles.id
    AND status = 'accepted'
  )
);

-- Drop and recreate athletes viewing coach profiles with explicit auth check
DROP POLICY IF EXISTS "Athletes can view related coach profiles" ON public.profiles;
CREATE POLICY "Athletes can view related coach profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.coach_athletes
    WHERE athlete_id = auth.uid()
    AND coach_id = profiles.id
    AND status = 'accepted'
  )
);

-- Fix: Ensure user_roles table requires authentication for all SELECT policies
-- The policy "Authenticated users can view coach roles" should explicitly check auth.uid() IS NOT NULL
DROP POLICY IF EXISTS "Authenticated users can view coach roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view coach roles"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  role = 'coach'::app_role
);

-- Also update "Users can view their own roles" to be explicit
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);