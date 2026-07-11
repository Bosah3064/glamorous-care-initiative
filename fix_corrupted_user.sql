-- Run this script in the Supabase SQL Editor to delete the corrupted user

DELETE FROM auth.users WHERE email = 'Olpha206@gmail.com' OR email = 'olpha206@gmail.com';

-- Let's also check if there are any other corrupted rows. 
-- If you run this script and it says "permission denied", make sure you are logged in as the project owner.
