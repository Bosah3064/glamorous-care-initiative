SET ROLE postgres;

-- Ensure the cryptography extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create a secure RPC function to allow admins to reset user passwords
CREATE OR REPLACE FUNCTION public.admin_reset_password(target_user_id UUID, new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run as the owner (postgres)
SET search_path = public, extensions
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- 1. Check if the executing user is an admin
    SELECT (role = 'admin' OR role = 'superadmin') INTO is_admin
    FROM public.members
    WHERE id = auth.uid();

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access denied. You must be an admin to perform this action.';
    END IF;

    -- 2. Update the user's password in the auth.users table
    -- We also repair any corrupted NULL JSONB fields that cause 500 errors during login
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'::jsonb),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
        aud = COALESCE(aud, 'authenticated'),
        role = COALESCE(role, 'authenticated'),
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Check if the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    RETURN TRUE;
END;
$$;
