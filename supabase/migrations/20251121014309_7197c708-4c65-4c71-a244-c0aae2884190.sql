-- Create athlete goals table for goal setting and tracking
CREATE TABLE public.athlete_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  goal_type TEXT NOT NULL, -- 'readiness', 'physical_test', 'training_load', 'competition'
  goal_name TEXT NOT NULL,
  target_value NUMERIC,
  target_unit TEXT,
  target_date DATE,
  current_value NUMERIC,
  baseline_value NUMERIC,
  notes TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'achieved', 'missed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.athlete_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for athlete goals
CREATE POLICY "Users can view their own goals" 
ON public.athlete_goals 
FOR SELECT 
USING (auth.uid() = athlete_id);

CREATE POLICY "Users can create their own goals" 
ON public.athlete_goals 
FOR INSERT 
WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Users can update their own goals" 
ON public.athlete_goals 
FOR UPDATE 
USING (auth.uid() = athlete_id);

CREATE POLICY "Users can delete their own goals" 
ON public.athlete_goals 
FOR DELETE 
USING (auth.uid() = athlete_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_athlete_goals_updated_at
BEFORE UPDATE ON public.athlete_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();