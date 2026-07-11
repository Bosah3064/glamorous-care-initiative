-- DIAGNOSTIC QUERY 1: Triggers on auth.users
-- This will show us if there are any broken triggers intercepting logins
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- DIAGNOSTIC QUERY 2: Source code of those trigger functions
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_body
FROM pg_proc p
JOIN pg_trigger t ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- DIAGNOSTIC QUERY 3: RLS Policies on members table
SELECT 
    policyname, 
    cmd as operation, 
    roles, 
    qual as using_expression, 
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'members';
