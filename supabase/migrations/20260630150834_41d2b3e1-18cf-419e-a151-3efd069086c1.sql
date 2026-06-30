
CREATE TABLE public.custom_test_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  category text NOT NULL,
  unit text NOT NULL,
  description text,
  inverse boolean NOT NULL DEFAULT false,
  use_age_based boolean NOT NULL DEFAULT false,
  norms jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_test_items TO authenticated;
GRANT ALL ON public.custom_test_items TO service_role;

ALTER TABLE public.custom_test_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own custom test items"
  ON public.custom_test_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own custom test items"
  ON public.custom_test_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own custom test items"
  ON public.custom_test_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own custom test items"
  ON public.custom_test_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_custom_test_items_updated_at
  BEFORE UPDATE ON public.custom_test_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_custom_test_items_user ON public.custom_test_items(user_id);
