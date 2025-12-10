-- Add comprehensive volume columns to training_sessions
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS strength_volume numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cardio_distance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS skill_reps integer DEFAULT 0;

-- Create function to update comprehensive volume from session_exercises
CREATE OR REPLACE FUNCTION public.update_session_volumes()
RETURNS TRIGGER AS $$
DECLARE
  total_strength numeric;
  total_cardio numeric;
  total_skill integer;
BEGIN
  -- Calculate totals from session_exercises
  SELECT 
    COALESCE(SUM(CASE WHEN exercise_type = 'strength' THEN total_volume ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN exercise_type = 'cardio' THEN distance_meters ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN exercise_type = 'skill' THEN repetitions ELSE 0 END), 0)
  INTO total_strength, total_cardio, total_skill
  FROM public.session_exercises
  WHERE session_id = COALESCE(NEW.session_id, OLD.session_id);

  -- Update the training_sessions table
  UPDATE public.training_sessions
  SET 
    strength_volume = total_strength,
    cardio_distance = total_cardio,
    skill_reps = total_skill
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-update volumes when exercises change
DROP TRIGGER IF EXISTS update_session_volumes_on_exercise_change ON public.session_exercises;
CREATE TRIGGER update_session_volumes_on_exercise_change
AFTER INSERT OR UPDATE OR DELETE ON public.session_exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_session_volumes();

-- Update existing sessions with their exercise volumes
UPDATE public.training_sessions ts
SET 
  strength_volume = COALESCE((
    SELECT SUM(total_volume) 
    FROM public.session_exercises se 
    WHERE se.session_id = ts.id AND se.exercise_type = 'strength'
  ), 0),
  cardio_distance = COALESCE((
    SELECT SUM(distance_meters) 
    FROM public.session_exercises se 
    WHERE se.session_id = ts.id AND se.exercise_type = 'cardio'
  ), 0),
  skill_reps = COALESCE((
    SELECT SUM(repetitions) 
    FROM public.session_exercises se 
    WHERE se.session_id = ts.id AND se.exercise_type = 'skill'
  ), 0);