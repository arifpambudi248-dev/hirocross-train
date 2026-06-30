
-- 1) Add SELECT policy for avatars bucket (public reads)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- 2) Restrict status transitions for athlete updates on coach_athletes
DROP POLICY IF EXISTS "Athletes can update their invitation status" ON public.coach_athletes;
CREATE POLICY "Athletes can update their invitation status"
ON public.coach_athletes
FOR UPDATE
TO authenticated
USING (athlete_id = auth.uid())
WITH CHECK (
  athlete_id = auth.uid()
  AND coach_id = coach_id
  AND (
    (invited_by = 'coach' AND status IN ('accepted','rejected'))
    OR (invited_by = 'athlete' AND status IN ('cancelled','pending'))
  )
);
