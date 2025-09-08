# Supabase Database Setup Instructions

Since programmatic table creation through the Supabase API has limitations, please follow these steps to manually create the required database tables.

## Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your **Intellinotes** project

## Step 2: Navigate to SQL Editor

1. In your project dashboard, look for the **SQL Editor** in the left sidebar
2. Click on **SQL Editor**
3. You should see a query interface

## Step 3: Execute the Database Schema

Copy and paste the following SQL code into the SQL Editor and click **Run**:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    otp_code VARCHAR(6),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    content TEXT,
    summary TEXT,
    status VARCHAR(50) DEFAULT 'uploaded',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_otp ON public.users(otp_code) WHERE otp_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON public.users(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON public.documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for documents table
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);
```

## Step 4: Verify Tables Were Created

After running the SQL, you should see a success message. You can verify the tables were created by:

1. Going to the **Table Editor** in the left sidebar
2. You should see `users` and `documents` tables listed

## Step 5: Test the Connection

Run the verification script from your backend directory:

```bash
cd backend
source venv/bin/activate
python3 setup_simple.py
```

## Troubleshooting

If you encounter any issues:

1. **Permission Error**: Make sure you're the owner of the Supabase project
2. **SQL Errors**: Check that you copied the entire SQL block correctly
3. **Connection Issues**: Verify your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the `.env` file

## Alternative: Direct Database Connection

If you have the direct PostgreSQL connection details, you can also connect using a PostgreSQL client like pgAdmin or DBeaver using these connection details:

- Host: `db.vtvskrxvozfotnglxaea.supabase.co`
- Port: `5432`
- Database: `postgres`
- Username: `postgres`
- Password: `[Your Supabase Database Password]`

Then execute the same SQL schema provided above.
