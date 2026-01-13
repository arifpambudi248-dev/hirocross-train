-- Add gender and sport fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male',
ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT NULL;

-- Create sport categories reference
COMMENT ON COLUMN public.profiles.gender IS 'Gender: male or female';
COMMENT ON COLUMN public.profiles.sport IS 'Sport category for the athlete';