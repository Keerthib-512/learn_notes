# Supabase RLS Performance Optimization Fix

## Issue Description
Supabase is showing a performance warning:
> Table public.documents has a row level security policy Documents access policy - DELETE that re-evaluates current_setting() or auth.<function>() for each row. This produces suboptimal query performance at scale.

## Root Cause
The issue occurs when RLS policies use `auth.uid()` directly instead of `(SELECT auth.uid())`. This causes Supabase to re-evaluate the auth function for every row, which is inefficient.

## Solution
Replace all instances of `auth.uid()` with `(SELECT auth.uid())` in RLS policies to cache the result.

## How to Fix

### Option 1: Run the Fix Script (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix_rls_performance.sql`
4. Click **Run**

### Option 2: Manual Fix
Execute these SQL commands in your Supabase SQL Editor:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

-- Recreate with optimized version
CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

## What Changed
- **Before**: `auth.uid() = user_id` (re-evaluates for each row)
- **After**: `(SELECT auth.uid()) = user_id` (caches the result)

## Performance Impact
- ✅ Eliminates function re-evaluation per row
- ✅ Improves query performance at scale
- ✅ Reduces database load
- ✅ Maintains same security level

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
