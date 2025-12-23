-- Add completion tracking columns to session_exercises
ALTER TABLE public.session_exercises
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Add assigned_by column to training_sessions to track who created the session
ALTER TABLE public.training_sessions
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_assigned boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_training_sessions_assigned ON public.training_sessions(is_assigned, user_id);
CREATE INDEX IF NOT EXISTS idx_session_exercises_completed ON public.session_exercises(is_completed);