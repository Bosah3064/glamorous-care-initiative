SET ROLE postgres;

-- 1. Fix NULL raw_app_meta_data (This is the #1 cause of "Database error querying schema" 500 error!)
UPDATE auth.users 
SET raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb
WHERE raw_app_meta_data IS NULL;

-- 2. Fix NULL raw_user_meta_data
UPDATE auth.users 
SET raw_user_meta_data = '{}'::jsonb
WHERE raw_user_meta_data IS NULL;

-- 3. Fix NULL aud
UPDATE auth.users 
SET aud = 'authenticated'
WHERE aud IS NULL OR aud = '';

-- 4. Fix NULL role
UPDATE auth.users 
SET role = 'authenticated'
WHERE role IS NULL OR role = '';

-- 5. Fix NULL is_super_admin
UPDATE auth.users
SET is_super_admin = false
WHERE is_super_admin IS NULL;

-- 6. Ensure encrypted_password is not NULL (if it is, set a dummy hash to prevent GoTrue from crashing, though usually it just rejects)
-- A default bcrypt hash for '12345678'
UPDATE auth.users
SET encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf'))
WHERE encrypted_password IS NULL OR encrypted_password = '';
