-- ==============================================================================
-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR
-- This updates the import function to prevent "duplicate key" errors
-- caused by the database trigger creating the member row at the same time.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION import_single_member(
    p_full_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_status TEXT,
    p_form_details JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    new_user_id UUID;
    encrypted_pw TEXT;
BEGIN
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with email % already exists', p_email;
    END IF;

    -- Generate a new UUID
    new_user_id := gen_random_uuid();
    
    -- Hash the default password "12345678"
    encrypted_pw := extensions.crypt('12345678', extensions.gen_salt('bf'));

    -- Insert into auth.users. 
    -- WARNING: This instantly triggers 'handle_new_user()' which creates a blank row in public.members!
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        raw_app_meta_data,
        created_at,
        updated_at,
        role,
        aud,
        confirmation_token
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        encrypted_pw,
        now(),
        jsonb_build_object('full_name', p_full_name),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        now(),
        now(),
        'authenticated',
        'authenticated',
        encode(gen_random_bytes(32), 'hex')
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        new_user_id,
        new_user_id::text,
        jsonb_build_object('sub', new_user_id::text, 'email', p_email),
        'email',
        now(),
        now(),
        now()
    );

    -- Insert or Update public.members
    -- We use ON CONFLICT DO UPDATE because the trigger has already created the row,
    -- but we need to overwrite it with the exact details the Admin provided (including the password reset flag).
    INSERT INTO public.members (
        id,
        full_name,
        email,
        phone,
        status,
        role,
        requires_password_reset,
        form_details,
        join_date,
        created_at
    ) VALUES (
        new_user_id,
        p_full_name,
        p_email,
        p_phone,
        p_status,
        'member',
        TRUE, -- Forces them to change the default password
        p_form_details,
        CURRENT_DATE,
        now()
    ) ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        status = EXCLUDED.status,
        role = EXCLUDED.role,
        requires_password_reset = EXCLUDED.requires_password_reset,
        form_details = EXCLUDED.form_details,
        join_date = EXCLUDED.join_date;

    RETURN new_user_id;
END;
$$;
