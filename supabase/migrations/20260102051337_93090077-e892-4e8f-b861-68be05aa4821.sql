-- Fix SECURITY DEFINER function by adding authorization check
CREATE OR REPLACE FUNCTION public.get_pending_athletes_for_coach(_coach_id uuid)
RETURNS TABLE (id uuid, athlete_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the coach
  IF auth.uid() != _coach_id THEN
    RAISE EXCEPTION 'Unauthorized: can only view own pending athletes';
  END IF;
  
  RETURN QUERY
  SELECT p.id, p.athlete_name
  FROM public.profiles p
  INNER JOIN public.coach_athletes ca ON ca.athlete_id = p.id
  WHERE ca.coach_id = _coach_id AND ca.status = 'pending';
END;
$$;