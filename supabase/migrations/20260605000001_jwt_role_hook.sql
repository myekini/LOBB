-- Embed the user's role in the JWT claims so the middleware can read it
-- without a second DB round-trip on every request.
--
-- After applying this migration you MUST enable the hook in the Supabase dashboard:
--   Authentication → Hooks → Custom Access Token Hook
--   → Set the function to: public.custom_access_token_hook
--
-- Once enabled, every new access token will carry app_metadata.role.
-- Existing sessions that predate the hook will still work via the DB fallback
-- in middleware.ts until they refresh their token (happens automatically).

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims    jsonb;
  user_role text;
BEGIN
  SELECT role::text INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      COALESCE(claims->'app_metadata', '{}'::jsonb) || jsonb_build_object('role', user_role)
    );
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Supabase Auth needs execute permission to call the hook
GRANT USAGE  ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
