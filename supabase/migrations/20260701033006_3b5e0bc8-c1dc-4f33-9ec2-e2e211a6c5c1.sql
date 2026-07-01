
-- Fix 1: annual_plans INSERT must also enforce user_id = auth.uid()
DROP POLICY IF EXISTS "Athletes can create their own annual plans" ON public.annual_plans;
CREATE POLICY "Athletes can create their own annual plans"
ON public.annual_plans
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = athlete_id AND auth.uid() = user_id);

-- Fix 2: coach_athletes UPDATE must prevent coach_id reassignment
DROP POLICY IF EXISTS "Athletes can update their invitation status" ON public.coach_athletes;

CREATE OR REPLACE FUNCTION public.prevent_coach_athletes_coach_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.coach_id IS DISTINCT FROM OLD.coach_id AND auth.uid() = OLD.athlete_id THEN
    RAISE EXCEPTION 'Athletes cannot change coach_id';
  END IF;
  IF NEW.athlete_id IS DISTINCT FROM OLD.athlete_id THEN
    RAISE EXCEPTION 'athlete_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_coach_athletes_coach_id_change ON public.coach_athletes;
CREATE TRIGGER trg_prevent_coach_athletes_coach_id_change
BEFORE UPDATE ON public.coach_athletes
FOR EACH ROW EXECUTE FUNCTION public.prevent_coach_athletes_coach_id_change();

CREATE POLICY "Athletes can update their invitation status"
ON public.coach_athletes
FOR UPDATE
TO authenticated
USING (athlete_id = auth.uid())
WITH CHECK (
  athlete_id = auth.uid()
  AND (
    (invited_by = 'coach' AND status = ANY (ARRAY['accepted','rejected']))
    OR (invited_by = 'athlete' AND status = ANY (ARRAY['cancelled','pending']))
  )
);

-- Fix 3: Public bucket allows listing — restrict SELECT on avatars to owner/coach
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

CREATE POLICY "Users can view their own avatar"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Coaches can view assigned athletes avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.coach_id = auth.uid()
      AND (ca.athlete_id)::text = (storage.foldername(objects.name))[1]
      AND ca.status = 'accepted'
  )
);
