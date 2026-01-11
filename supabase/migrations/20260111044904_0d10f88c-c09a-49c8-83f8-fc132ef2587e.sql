-- Fix 1: Restrict coaches to only view roles of their assigned athletes
DROP POLICY IF EXISTS "Coaches can view all user roles" ON public.user_roles;

CREATE POLICY "Coaches can view related user roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) AND (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.coach_athletes
      WHERE coach_id = auth.uid()
      AND athlete_id = user_roles.user_id
    )
  )
);

-- Fix 2: Restrict coach avatar operations to only assigned athletes
DROP POLICY IF EXISTS "Coaches can upload avatars for any athlete" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update any avatar" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete any avatar" ON storage.objects;

CREATE POLICY "Coaches can upload avatars for assigned athletes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes
    WHERE coach_id = auth.uid()
    AND athlete_id::text = (storage.foldername(name))[1]
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can update assigned athletes avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes
    WHERE coach_id = auth.uid()
    AND athlete_id::text = (storage.foldername(name))[1]
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can delete assigned athletes avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes
    WHERE coach_id = auth.uid()
    AND athlete_id::text = (storage.foldername(name))[1]
    AND status = 'accepted'
  )
);