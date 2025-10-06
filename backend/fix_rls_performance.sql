-- Fix Supabase RLS Performance Issues
-- This script optimizes the Row Level Security policies by caching auth.uid() results

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

-- Create optimized RLS policies for users table
-- Using (SELECT auth.uid()) instead of auth.uid() for better performance
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Create optimized RLS policies for documents table
-- Using (SELECT auth.uid()) instead of auth.uid() for better performance
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'documents')
ORDER BY tablename, policyname;
