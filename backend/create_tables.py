#!/usr/bin/env python3
"""
Table Creation Script for Intellinotes
Creates database tables via Supabase client
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# SQL for creating tables
CREATE_USERS_TABLE = """
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
"""

CREATE_DOCUMENTS_TABLE = """
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
"""

CREATE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
"""

def create_tables():
    """Create database tables"""
    try:
        # Load environment variables
        load_dotenv()
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            print("❌ Supabase credentials not found")
            return False
        
        print("📡 Connecting to Supabase...")
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Connected successfully!")
        
        # Try to create tables using RPC call
        try:
            print("🔧 Creating users table...")
            result = supabase.rpc('exec_sql', {'sql': CREATE_USERS_TABLE}).execute()
            print("✅ Users table created/verified")
            
            print("🔧 Creating documents table...")
            result = supabase.rpc('exec_sql', {'sql': CREATE_DOCUMENTS_TABLE}).execute()
            print("✅ Documents table created/verified")
            
            print("🔧 Creating indexes...")
            result = supabase.rpc('exec_sql', {'sql': CREATE_INDEXES}).execute()
            print("✅ Indexes created/verified")
            
            return True
            
        except Exception as e:
            print(f"❌ RPC execution failed: {e}")
            print("ℹ️  This is expected - Supabase doesn't provide exec_sql by default")
            return False
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def verify_tables():
    """Verify tables exist"""
    try:
        load_dotenv()
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🔍 Checking if tables exist...")
        
        # Check users table
        try:
            response = supabase.table("users").select("id").limit(1).execute()
            print("✅ Users table exists and is accessible")
            users_exist = True
        except Exception as e:
            print(f"❌ Users table: {e}")
            users_exist = False
        
        # Check documents table
        try:
            response = supabase.table("documents").select("id").limit(1).execute()
            print("✅ Documents table exists and is accessible")
            documents_exist = True
        except Exception as e:
            print(f"❌ Documents table: {e}")
            documents_exist = False
        
        return users_exist and documents_exist
        
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False

def main():
    print("🎯 Intellinotes Table Creation")
    print("=" * 35)
    
    # First check if tables already exist
    if verify_tables():
        print("🎉 All tables already exist! No action needed.")
        return
    
    # Try to create tables
    print("🚀 Attempting to create tables...")
    if create_tables():
        print("🎉 Tables created successfully!")
    else:
        print("\n❌ Automatic table creation failed.")
        print("\n📋 Manual Setup Required:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your Intellinotes project")
        print("3. Go to SQL Editor")
        print("4. Run the SQL from database_schema.sql")
        print("\nOr use the SETUP_INSTRUCTIONS.md file for detailed steps.")

if __name__ == "__main__":
    main()
