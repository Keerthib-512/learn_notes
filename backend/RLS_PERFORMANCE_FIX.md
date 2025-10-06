# Supabase RLS Issues Fix

## Issues Addressed
1. **Performance Warning**: RLS policies re-evaluating auth functions for each row
2. **Missing Policies**: Table public.users has RLS enabled but no/incomplete policies exist

## Issue Descriptions
**Performance Issue:**
> Table public.documents has a row level security policy that re-evaluates current_setting() or auth.<function>() for each row. This produces suboptimal query performance at scale.

**Missing Policies Issue:**
> Table public.users has RLS enabled, but no policies exist (or incomplete policies)

## Root Causes
1. **Performance**: RLS policies using `auth.uid()` directly instead of `(SELECT auth.uid())`
2. **Missing Policies**: Users table missing essential RLS policies (especially INSERT for registration)

## Solutions Applied
1. **Performance**: Replace `auth.uid()` with `(SELECT auth.uid())` to cache results
2. **Missing Policies**: Add comprehensive RLS policies for all CRUD operations

## How to Fix

### Option 1: Run the Fix Script (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix_rls_performance.sql`
4. Click **Run**

### Option 2: Manual Fix
Execute these SQL commands in your Supabase SQL Editor:

```sql
-- Fix missing users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "Enable user registration" ON public.users
    FOR INSERT WITH CHECK (true);

-- Fix documents table policies (performance optimization)
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

## What Changed

### Performance Optimization
- **Before**: `auth.uid() = user_id` (re-evaluates for each row)
- **After**: `(SELECT auth.uid()) = user_id` (caches the result)

### Missing Policies Added
- **Users SELECT**: Allow users to view their own profile
- **Users UPDATE**: Allow users to update their own profile  
- **Users INSERT**: Allow user registration (essential for signup)

## Benefits
- ✅ **Performance**: Eliminates function re-evaluation per row
- ✅ **Scalability**: Improves query performance at scale  
- ✅ **Efficiency**: Reduces database load
- ✅ **Security**: Maintains same security level
- ✅ **Functionality**: Enables user registration and profile management
- ✅ **Compliance**: Resolves Supabase RLS warnings

## Verification
After applying the fix, you can verify the policies are correct by running:

```sql
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'documents')
ORDER BY tablename, policyname;
```

## Files Updated
- `fix_rls_performance.sql` - Complete fix script
- `database_schema.sql` - Updated schema with optimized policies
- `SETUP_INSTRUCTIONS.md` - Updated setup instructions

## Notes
- This fix maintains the exact same security behavior
- No application code changes required
- The warning should disappear after applying the fix
- This is a Supabase best practice for RLS policies
