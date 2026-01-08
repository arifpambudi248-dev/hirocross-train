-- Fix: Add authorization check to has_active_subscription function
-- This prevents any user from checking other users' subscription status

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to check their own subscription or admins to check any
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  IF auth.uid() != _user_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND end_date >= CURRENT_DATE
  );
END;
$$;