-- PostgREST pre-request hook: maps Clerk JWTs to the authenticated DB role.
--
-- Problem: The Clerk JWT template at faithful-troll-4.clerk.accounts.dev injects
-- role="anon" into Clerk user JWTs. PostgREST reads this and assigns the anon DB
-- role, so "to authenticated" RLS policies never fire for signed-in users.
--
-- Fix: any JWT with a 'sub' claim is an authenticated user (PostgREST already
-- validated the signature using the Clerk RSA key in PGRST_JWT_SECRET). True
-- anonymous requests use the Supabase anon JWT which has no 'sub' claim.
--
-- Note: ALTER ROLE ... SET is not picked up by PostgREST 14.10 on config reload;
-- PGRST_DB_PRE_REQUEST must be set as an env var on the container.

CREATE OR REPLACE FUNCTION public.pgrst_role_setter()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
BEGIN
  claims := current_setting('request.jwt.claims', true)::jsonb;
  IF claims IS NOT NULL AND (claims ->> 'sub') IS NOT NULL THEN
    SET LOCAL ROLE authenticated;
  END IF;
END;
$$;

ALTER ROLE authenticator IN DATABASE postgres
  SET "pgrst.db_pre_request" = 'public.pgrst_role_setter';

NOTIFY pgrst, 'reload config';
