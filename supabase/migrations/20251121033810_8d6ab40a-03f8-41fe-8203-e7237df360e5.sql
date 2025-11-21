-- Create training session templates table
CREATE TABLE public.training_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  session_name TEXT,
  rpe INTEGER NOT NULL CHECK (rpe >= 1 AND rpe <= 10),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.training_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_templates
CREATE POLICY "Users can view their own templates"
  ON public.training_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.training_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.training_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.training_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Coaches can view all templates
CREATE POLICY "Coaches can view all templates"
  ON public.training_templates
  FOR SELECT
  USING (has_role(auth.uid(), 'coach'::app_role));

-- Coaches can create templates for any user
CREATE POLICY "Coaches can create templates for any user"
  ON public.training_templates
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'coach'::app_role));

-- Coaches can update all templates
CREATE POLICY "Coaches can update all templates"
  ON public.training_templates
  FOR UPDATE
  USING (has_role(auth.uid(), 'coach'::app_role));

-- Coaches can delete all templates
CREATE POLICY "Coaches can delete all templates"
  ON public.training_templates
  FOR DELETE
  USING (has_role(auth.uid(), 'coach'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_training_templates_updated_at
  BEFORE UPDATE ON public.training_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();