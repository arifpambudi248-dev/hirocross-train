-- Add height column to profiles for BMI calculation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS height numeric;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.height IS 'Height in centimeters for BMI calculation';