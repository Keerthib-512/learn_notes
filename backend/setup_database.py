#!/usr/bin/env python3
"""
Database Setup Script for Intellinotes
Attempts to create database tables programmatically
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

def setup_database():
    """Set up the database tables"""
    try:
        # Load environment variables
        load_dotenv()
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            print("❌ Supabase credentials not found in environment")
            return False
        
        print("📡 Connecting to Supabase...")
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase successfully!")
        
        # Read the SQL schema
        schema_path = "database_schema.sql"
        if not os.path.exists(schema_path):
            print(f"❌ Schema file not found: {schema_path}")
            return False
        
        with open(schema_path, 'r') as f:
            sql_content = f.read()
        
        print("🔧 Executing database schema...")
        
        # Try to execute SQL using RPC (this may not work depending on Supabase setup)
        try:
            result = supabase.rpc('exec_sql', {'sql': sql_content}).execute()
            print("✅ Database schema executed successfully!")
            return True
        except Exception as e:
            print(f"❌ Failed to execute schema via RPC: {e}")
            print("ℹ️  You may need to run the SQL manually in Supabase dashboard")
            return False
            
    except Exception as e:
        print(f"❌ Database setup error: {e}")
        return False

def verify_tables():
    """Verify that tables were created"""
    try:
        load_dotenv()
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🔍 Verifying table creation...")
        
        # Check users table
        try:
            response = supabase.table("users").select("id").limit(1).execute()
            print("✅ Users table exists")
        except Exception as e:
            print(f"❌ Users table check failed: {e}")
            return False
        
        # Check documents table
        try:
            response = supabase.table("documents").select("id").limit(1).execute()
            print("✅ Documents table exists")
        except Exception as e:
            print(f"❌ Documents table check failed: {e}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Table verification error: {e}")
        return False

def main():
    print("🎯 Intellinotes Database Setup")
    print("=" * 30)
    
    if setup_database():
        print("\n🔍 Verifying setup...")
        if verify_tables():
            print("\n🎉 Database setup completed successfully!")
        else:
            print("\n⚠️  Database setup may be incomplete")
    else:
        print("\n❌ Database setup failed")
        print("\nPlease run the SQL schema manually in your Supabase dashboard:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project")
        print("3. Go to SQL Editor")
        print("4. Run the contents of database_schema.sql")

if __name__ == "__main__":
    main()
