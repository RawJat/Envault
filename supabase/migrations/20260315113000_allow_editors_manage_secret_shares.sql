-- Allow both owners and editors to manage secret shares
CREATE OR REPLACE FUNCTION public.user_can_manage_secret_shares(p_secret_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.secrets s
    LEFT JOIN public.project_members pm
      ON pm.project_id = s.project_id
      AND pm.user_id = p_user_id
      AND pm.role = 'editor'
    WHERE s.id = p_secret_id
      AND (
        public.user_owns_project(s.project_id, p_user_id)
        OR pm.user_id IS NOT NULL
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_secret_shares TO authenticated;
