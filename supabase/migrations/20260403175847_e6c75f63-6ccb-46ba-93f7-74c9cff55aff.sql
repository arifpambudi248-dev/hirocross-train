
DROP POLICY IF EXISTS "Coaches can update assigned athletes avatars" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete assigned athletes avatars" ON storage.objects;

CREATE POLICY "Coaches can update assigned athletes avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.coach_id = auth.uid()
    AND ca.athlete_id::text = (storage.foldername(name))[1]
    AND ca.status = 'accepted'
  )
);

CREATE POLICY "Coaches can delete assigned athletes avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes ca
    WHERE ca.coach_id = auth.uid()
    AND ca.athlete_id::text = (storage.foldername(name))[1]
    AND ca.status = 'accepted'
  )
);
