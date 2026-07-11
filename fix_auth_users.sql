-- =============================================================================
-- FIX AUTH.USERS DATA CORRUPTION (From Excel Imports)
-- Run this ENTIRE script in your Supabase SQL Editor
-- This will NOT delete any users - it only REPAIRS corrupted/missing data
-- =============================================================================

-- STEP 1: Fix missing raw_app_meta_data (GoTrue CRASHES if this is NULL)
-- This is the #1 cause of "Database error querying schema" 500 errors
UPDATE auth.users 
SET raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb 
WHERE raw_app_meta_data IS NULL;

-- STEP 2: Fix missing raw_user_meta_data
UPDATE auth.users 
SET raw_user_meta_data = '{}'::jsonb 
WHERE raw_user_meta_data IS NULL;

-- STEP 3: Fix missing role or aud (GoTrue requires these)
UPDATE auth.users SET role = 'authenticated' WHERE role IS NULL OR role = '';
UPDATE auth.users SET aud = 'authenticated' WHERE aud IS NULL OR aud = '';

-- STEP 4: Fix missing instance_id
UPDATE auth.users 
SET instance_id = '00000000-0000-0000-0000-000000000000' 
WHERE instance_id IS NULL;

-- STEP 5: Fix missing encrypted_password
-- Give a default password "12345678" to any user who has no password
UPDATE auth.users 
SET encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf'))
WHERE encrypted_password IS NULL OR length(encrypted_password) < 10;

-- STEP 6: Confirm emails for all users (prevents "email not confirmed" errors)
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- STEP 7: Fix orphaned auth.identities
-- Sometimes manual/excel inserts miss the auth.identities table, which GoTrue REQUIRES for login
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
SELECT 
    id, id, id::text, 
    jsonb_build_object('sub', id::text, 'email', email), 
    'email', now(), now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM auth.identities WHERE provider = 'email')
ON CONFLICT DO NOTHING;

-- STEP 8: Sync public.members table with auth.users
-- Any auth user that doesn't have a members row will get one
INSERT INTO public.members (id, full_name, email, role, status, requires_password_reset, form_details)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
    email, 
    'member', 
    'active', 
    true, 
    '{}'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.members)
ON CONFLICT (id) DO NOTHING;

-- STEP 9: Verify fix worked - this should return 0 rows
SELECT id, email, 
    CASE WHEN raw_app_meta_data IS NULL THEN 'MISSING raw_app_meta_data' END as issue1,
    CASE WHEN encrypted_password IS NULL OR length(encrypted_password) < 10 THEN 'MISSING password' END as issue2,
    CASE WHEN role IS NULL OR role = '' THEN 'MISSING role' END as issue3,
    CASE WHEN id NOT IN (SELECT user_id FROM auth.identities) THEN 'MISSING identity' END as issue4
FROM auth.users
WHERE raw_app_meta_data IS NULL 
   OR encrypted_password IS NULL 
   OR length(encrypted_password) < 10
   OR role IS NULL OR role = ''
   OR id NOT IN (SELECT user_id FROM auth.identities);
