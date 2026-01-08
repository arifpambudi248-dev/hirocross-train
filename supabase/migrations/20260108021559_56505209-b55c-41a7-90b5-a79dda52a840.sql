-- Fix 1: Update user_roles policy to require authentication for viewing coach roles
-- Drop the old policy that allowed anyone to view coach roles
DROP POLICY IF EXISTS "Athletes can view coach roles" ON public.user_roles;

-- Create new policy that requires authentication to view coach roles
CREATE POLICY "Authenticated users can view coach roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'coach'::app_role);

-- Fix 2: Update subscription_plans policy to require authentication
-- Drop the old policy that allowed anyone to view plans
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;

-- Create new policy that requires authentication to view plans
CREATE POLICY "Authenticated users can view active subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_active = true);

-- Fix 3: Update profiles policy to restrict coach visibility to athletes with relationships
-- Drop the old policy that allowed any authenticated user to view all coach profiles
DROP POLICY IF EXISTS "Athletes can view coach profiles" ON public.profiles;

-- Create new policy that restricts coach profile visibility to:
-- 1. Athletes who have a relationship with the coach
-- 2. The coach themselves (already covered by "Users can view their own profile")
CREATE POLICY "Athletes can view related coach profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id 
    AND ur.role = 'coach'::app_role
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.coach_id = profiles.id
      AND ca.athlete_id = auth.uid()
    )
  )
);