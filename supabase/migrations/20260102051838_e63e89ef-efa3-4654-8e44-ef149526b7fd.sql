-- Fix: Require authentication for viewing coach profiles
-- Drop the existing policy that allows unauthenticated access
DROP POLICY IF EXISTS "Athletes can view coach profiles" ON public.profiles;

-- Recreate the policy with authentication check
CREATE POLICY "Athletes can view coach profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'coach'::app_role
  )
);