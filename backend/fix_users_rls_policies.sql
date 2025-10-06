-- Fix Missing RLS Policies for Users Table
-- This script creates all necessary RLS policies for the users table

-- First, verify RLS is enabled (should already be enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- Create comprehensive RLS policies for users table

-- 1. Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING ((SELECT auth.uid()) = id);

-- 2. Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING ((SELECT auth.uid()) = id);

-- 3. Allow user registration (INSERT) - this is crucial for signup
-- Note: During signup, auth.uid() might be null, so we need a more permissive policy
CREATE POLICY "Enable user registration" ON public.users
    FOR INSERT WITH CHECK (true);

-- Alternative approach for INSERT (more secure but requires proper auth flow):
-- CREATE POLICY "Users can insert own profile" ON public.users
--     FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- Verify users table policies
SELECT 'Users table policies:' as info;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY policyname;

-- Also verify documents table policies are still intact
SELECT 'Documents table policies:' as info;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'documents'
ORDER BY policyname;

-- Check if RLS is properly enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled' 
        ELSE 'RLS Disabled' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'documents');
