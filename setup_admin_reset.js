const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wbprrsuhkmdreuzhzmkq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicHJyc3Voa21kcmV1emh6bWtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzAxMDAwNiwiZXhwIjoyMDk4NTg2MDA2fQ.C3lTGy4ljPNgsYINS0Za2hbrbuRs90-WNeCHzvqQBks';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
  const sql = `
  -- Create the admin_reset_password function
  CREATE OR REPLACE FUNCTION admin_reset_password(
      target_user_id UUID,
      new_password TEXT
  )
  RETURNS JSON
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
      caller_role TEXT;
      result_json JSON;
  BEGIN
      -- 1. Check if caller is an admin
      SELECT role INTO caller_role FROM public.members WHERE id = auth.uid();
      
      IF caller_role NOT IN ('admin', 'chairperson') THEN
          RAISE EXCEPTION 'Unauthorized: Only admins can reset passwords.';
      END IF;

      -- 2. Update the password using pgcrypto natively!
      -- auth.users uses bcrypt. We can update it directly since this is SECURITY DEFINER.
      UPDATE auth.users 
      SET encrypted_password = crypt(new_password, gen_salt('bf'))
      WHERE id = target_user_id;

      IF NOT FOUND THEN
          RAISE EXCEPTION 'User not found.';
      END IF;

      -- 3. Clear any requiring password reset flag if present
      UPDATE public.members 
      SET requires_password_reset = false 
      WHERE id = target_user_id;

      RETURN '{"status": "success"}'::JSON;
  END;
  $$;
  `;

  const { error } = await supabase.rpc('exec_sql', { query: sql }).catch(() => ({error: 'exec_sql not found'}));
  console.log("Setup error via rpc:", error);
}

setup();
