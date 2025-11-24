-- Update function to handle role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, athlete_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'athlete_name', 'User')
  );
  
  -- Insert role from signup metadata, default to athlete if not specified
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'role', 'athlete')::app_role
  );
  
  RETURN new;
END;
$$;

-- Create trigger to call function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();