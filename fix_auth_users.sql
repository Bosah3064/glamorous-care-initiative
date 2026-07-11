-- Run this in Supabase SQL Editor
-- This will FIX any corrupted data in auth.users that is causing the GoTrue 500 error!

-- 1. Fix missing app meta data (GoTrue crashes if this is null)
UPDATE auth.users 
SET raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb 
WHERE raw_app_meta_data IS NULL;

-- 2. Fix missing user meta data
UPDATE auth.users 
SET raw_user_meta_data = '{}'::jsonb 
WHERE raw_user_meta_data IS NULL;

-- 3. Fix missing role or aud
UPDATE auth.users SET role = 'authenticated' WHERE role IS NULL;
UPDATE auth.users SET aud = 'authenticated' WHERE aud IS NULL;

-- 4. Fix missing encrypted_password
-- If someone was inserted without a password, give them a default bcrypt hash so GoTrue doesn't crash
UPDATE auth.users 
SET encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf'))
WHERE encrypted_password IS NULL OR length(encrypted_password) < 10;

-- 5. Fix orphaned auth.identities
-- Sometimes manual inserts miss the auth.identities table, which GoTrue requires!
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
SELECT 
    id, id, id::text, 
    jsonb_build_object('sub', id::text, 'email', email), 
    'email', now(), now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM auth.identities WHERE provider = 'email')
ON CONFLICT DO NOTHING;

-- 6. Ensure public.members matches auth.users
INSERT INTO public.members (id, full_name, email, role, status, requires_password_reset, form_details)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'Unknown Name'), 
    email, 
    'member', 
    'active', 
    true, 
    '{}'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.members)
ON CONFLICT DO NOTHING;
