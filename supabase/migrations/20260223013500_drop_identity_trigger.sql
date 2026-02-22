-- Revert the smart identity trigger as it conflicts with Supabase GoTrue's admin-level execution phase
DROP TRIGGER IF EXISTS ensure_smart_identity_linking_trigger ON auth.identities;
DROP FUNCTION IF EXISTS public.check_smart_identity_linking();

-- Revert the original strict identity trigger that was blocking cross-email linking
DROP TRIGGER IF EXISTS ensure_identity_email_match_trigger ON auth.identities;
DROP FUNCTION IF EXISTS public.check_identity_email_match();
