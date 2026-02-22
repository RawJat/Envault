-- This script resolves the 'function_search_path_mutable' security linter warning.
-- It explicitly sets the search_path for the 'check_global_email_uniqueness' function.

ALTER FUNCTION public.check_global_email_uniqueness() SET search_path = '';
