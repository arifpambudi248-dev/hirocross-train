-- Add exercise_phase column to session_exercises
ALTER TABLE public.session_exercises 
ADD COLUMN IF NOT EXISTS exercise_phase text DEFAULT 'main';

-- Update exercise_type to allow more types (speed, technique)
-- No constraint change needed as it's text type

-- Create index for exercise_phase
CREATE INDEX IF NOT EXISTS idx_session_exercises_phase ON public.session_exercises(exercise_phase);