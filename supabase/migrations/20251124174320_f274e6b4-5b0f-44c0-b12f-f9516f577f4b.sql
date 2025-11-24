-- Add age column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for avatar storage
CREATE POLICY "Users can view all avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Coaches can upload avatars for any athlete"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Coaches can update any avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Coaches can delete any avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'coach'::app_role)
);