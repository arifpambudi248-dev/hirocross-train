-- Create annual_plans table
CREATE TABLE public.annual_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  competition_date DATE NOT NULL,
  percentages JSONB NOT NULL DEFAULT '{"general_prep": 40, "specific_prep": 30, "pre_competition": 20, "competition": 10}'::jsonb,
  planned_loads JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.annual_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own annual plans"
ON public.annual_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own annual plans"
ON public.annual_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annual plans"
ON public.annual_plans
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annual plans"
ON public.annual_plans
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_annual_plans_updated_at
BEFORE UPDATE ON public.annual_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();