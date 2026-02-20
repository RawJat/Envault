-- ==============================================================================
-- Fix RLS for Read-Repair (Allow Viewers/Members to Rotate Secrets)
-- ==============================================================================
-- Problem: 
-- The client-side Read-Repair logic tries to UPDATE secrets with a new key_id.
-- However, standard Project Members (Viewers) do not have UPDATE permission on secrets.
-- They only have SELECT permission. RLS blocks the update.
--
-- Solution:
-- Create a SECURITY DEFINER function `rotate_secret` that allows any user with 
-- VIEW access to a secret to perform the rotation update.
-- This bypasses the RLS for the update itself, but strictly validates that the 
-- user is allowed to SEE the secret first.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rotate_secret(
  p_secret_id uuid,
  p_new_value text,
  p_new_key_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_user_id uuid;
  v_can_view boolean;
BEGIN
  -- 1. Get current user
  v_user_id := auth.uid();

  -- 2. Verify existence and get Project ID
  SELECT project_id INTO v_project_id
  FROM public.secrets
  WHERE id = p_secret_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Secret not found';
  END IF;

  -- 3. Check Permissions (Manually, since we bypassed RLS)
  -- User must be able to SELECT the secret to rotate it.
  -- We reuse our existing helper functions or logic.
  -- Logic matches "secrets_select_policy":
  -- Owner OR Member OR Granular Share
  
  SELECT (
    public.user_owns_project(v_project_id, v_user_id) OR
    public.user_is_project_member(v_project_id, v_user_id) OR
    public.user_has_granular_secret_share(p_secret_id, v_user_id)
  ) INTO v_can_view;

  IF NOT v_can_view THEN
    RAISE EXCEPTION 'Access denied: You cannot view this secret';
  END IF;

  -- 4. Perform Update
  UPDATE public.secrets
  SET 
    value = p_new_value,
    key_id = p_new_key_id,
    -- We do NOT update last_updated_at or last_updated_by to preserve audit trail of *content* changes?
    -- Or do we? Rotation is a system maintenance. 
    -- Let's update `updated_at` but maybe keep `last_updated_by`? 
    -- Actually, standard practice: strict updates.
    last_updated_at = now()
  WHERE id = p_secret_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_secret TO authenticated;
