-- Fix profiles RLS policy to restrict coach access to pending athlete profiles
-- Coaches should only see athlete_name for pending relationships, not full health data

-- Drop the existing coach policy that exposes too much data for pending relationships
DROP POLICY IF EXISTS "Coaches can view assigned athletes profiles" ON public.profiles;

-- Create new policy: Coaches can view FULL profile data only for ACCEPTED relationships
CREATE POLICY "Coaches can view accepted athletes full profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'coach'::app_role) AND (
    -- Coach can see their own profile
    id = auth.uid()
    OR
    -- Coach can see full profiles of ACCEPTED athletes only
    EXISTS (
      SELECT 1 FROM public.coach_athletes
      WHERE coach_athletes.coach_id = auth.uid()
        AND coach_athletes.athlete_id = profiles.id
        AND coach_athletes.status = 'accepted'
    )
  )
);

-- Create a separate view for pending athlete basic info (name only)
-- Since RLS cannot restrict columns, we create a separate secure view
CREATE OR REPLACE VIEW public.pending_athlete_names AS
SELECT 
  p.id,
  p.athlete_name
FROM public.profiles p
INNER JOIN public.coach_athletes ca ON ca.athlete_id = p.id
WHERE ca.status = 'pending';

-- Grant access to the view
GRANT SELECT ON public.pending_athlete_names TO authenticated;

-- Create RLS-like security using a function for the view
CREATE OR REPLACE FUNCTION public.get_pending_athletes_for_coach(_coach_id uuid)
RETURNS TABLE (
  id uuid,
  athlete_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.athlete_name
  FROM public.profiles p
  INNER JOIN public.coach_athletes ca ON ca.athlete_id = p.id
  WHERE ca.coach_id = _coach_id
    AND ca.status = 'pending'
$$;