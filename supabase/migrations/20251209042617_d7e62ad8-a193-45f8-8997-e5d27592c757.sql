-- Create table for exercise details within training sessions
CREATE TABLE public.session_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT 'strength', -- strength, cardio, skill
  
  -- For strength exercises
  sets INTEGER,
  reps INTEGER,
  weight_kg NUMERIC,
  
  -- For cardio exercises (running, cycling, etc.)
  distance_meters NUMERIC,
  duration_seconds INTEGER,
  
  -- For skill exercises (punches, kicks, etc.)
  repetitions INTEGER,
  
  -- Calculated totals
  total_volume NUMERIC, -- For strength: sets * reps * weight; For cardio: distance; For skill: repetitions
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;

-- Create policies - inherit access from parent training_sessions table
CREATE POLICY "Users can view exercises of their own sessions"
ON public.session_exercises
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.id = session_exercises.session_id
    AND ts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create exercises for their own sessions"
ON public.session_exercises
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.id = session_exercises.session_id
    AND ts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update exercises of their own sessions"
ON public.session_exercises
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.id = session_exercises.session_id
    AND ts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete exercises of their own sessions"
ON public.session_exercises
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.id = session_exercises.session_id
    AND ts.user_id = auth.uid()
  )
);

-- Coach policies
CREATE POLICY "Coaches can view all session exercises"
ON public.session_exercises
FOR SELECT
USING (has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Coaches can create exercises for any session"
ON public.session_exercises
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Coaches can update all session exercises"
ON public.session_exercises
FOR UPDATE
USING (has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Coaches can delete all session exercises"
ON public.session_exercises
FOR DELETE
USING (has_role(auth.uid(), 'coach'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_session_exercises_updated_at
BEFORE UPDATE ON public.session_exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();