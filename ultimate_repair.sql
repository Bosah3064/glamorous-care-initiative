SET ROLE postgres;

-- 1. Fix ALL boolean flags that might be causing the Go unmarshaler to panic
UPDATE auth.users 
SET 
    is_super_admin = COALESCE(is_super_admin, false),
    is_sso_user = COALESCE(is_sso_user, false),
    is_anonymous = COALESCE(is_anonymous, false),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    phone = NULLIF(phone, ''), -- Phone MUST be NULL if empty, not an empty string
    email_change = COALESCE(email_change, ''),
    phone_change = COALESCE(phone_change, ''),
    recovery_token = COALESCE(recovery_token, ''),
    confirmation_token = COALESCE(confirmation_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change_token = COALESCE(phone_change_token, '');

-- 2. Ensure identities data is completely valid
UPDATE auth.identities
SET identity_data = jsonb_build_object('sub', user_id::text, 'email', (SELECT email FROM auth.users WHERE id = user_id))
WHERE identity_data IS NULL OR identity_data = '{}'::jsonb;
