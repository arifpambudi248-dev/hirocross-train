-- Fix user_roles RLS policies to prevent privilege escalation
-- Only allow database triggers/system to manage roles, not regular users

-- Drop existing policies if any
DROP POLICY IF EXISTS "Prevent users from assigning roles" ON public.user_roles;
DROP POLICY IF EXISTS "Prevent role updates" ON public.user_roles;
DROP POLICY IF EXISTS "Prevent role deletion" ON public.user_roles;

-- Explicitly deny INSERT for all authenticated users
-- Only database triggers can insert roles
CREATE POLICY "Prevent users from assigning roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Explicitly deny UPDATE for all authenticated users
CREATE POLICY "Prevent role updates"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false);

-- Explicitly deny DELETE for all authenticated users
CREATE POLICY "Prevent role deletion"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);