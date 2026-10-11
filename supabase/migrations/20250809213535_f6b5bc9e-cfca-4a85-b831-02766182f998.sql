-- Fix linter: set search_path for functions
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.keep_last_three_versions() SET search_path = public;
