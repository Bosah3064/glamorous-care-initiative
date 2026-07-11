-- Run this script in the Supabase SQL Editor

-- 1. Create the secure admin password reset function
CREATE OR REPLACE FUNCTION public.admin_reset_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- 1. Check if caller is an admin
    SELECT role INTO caller_role FROM public.members WHERE id = auth.uid();
    
    IF caller_role NOT IN ('admin', 'chairperson') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can reset passwords.';
    END IF;

    -- 2. Update the password natively (auth.users uses bcrypt)
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    -- 3. Optionally clear the "requires_password_reset" flag if you have it
    -- UPDATE public.members SET requires_password_reset = false WHERE id = target_user_id;

    RETURN '{"status": "success"}'::JSON;
END;
$$;

-- 2. Grant permissions so the API can call it
GRANT EXECUTE ON FUNCTION public.admin_reset_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(UUID, TEXT) TO service_role;
