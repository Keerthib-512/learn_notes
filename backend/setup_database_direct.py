#!/usr/bin/env python3
"""
Alternative Database Setup Script for Intellinotes
Uses direct PostgreSQL connection approach
"""

import os
from dotenv import load_dotenv

def setup_with_direct_connection():
    """Setup database using direct PostgreSQL connection"""
    print("🎯 Direct PostgreSQL Connection Setup")
    print("=" * 40)
    
    # Check if psycopg2 is available
    try:
        import psycopg2
        print("✅ psycopg2 is available")
    except ImportError:
        print("❌ psycopg2 not installed")
        print("💡 This approach requires: pip install psycopg2-binary")
        print("⚠️  Note: This may require PostgreSQL development headers")
        return False
    
    # Load environment
    load_dotenv()
    
    # Connection string format
    connection_params = {
        'host': 'db.vtvskrxvozfotnglxaea.supabase.co',
        'port': 5432,
        'database': 'postgres',
        'user': 'postgres',
        'password': os.getenv('SUPABASE_DB_PASSWORD')
    }
    
    if not connection_params['password']:
        print("❌ Database password not found")
        print("💡 Set SUPABASE_DB_PASSWORD in your .env file")
        print("🔑 Get it from: Supabase Dashboard > Settings > Database > Connection string")
        return False
    
    try:
        print("📡 Connecting to PostgreSQL...")
        conn = psycopg2.connect(**connection_params)
        cursor = conn.cursor()
        print("✅ Connected successfully!")
        
        # Read and execute schema
        schema_file = "database_schema.sql"
        if os.path.exists(schema_file):
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
            
            print("🔧 Executing database schema...")
            cursor.execute(schema_sql)
            conn.commit()
            print("✅ Database schema executed!")
            
            # Verify tables
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            tables = cursor.fetchall()
            print(f"📋 Created tables: {[table[0] for table in tables]}")
            
            cursor.close()
            conn.close()
            return True
        else:
            print(f"❌ Schema file not found: {schema_file}")
            return False
            
    except Exception as e:
        print(f"❌ Database setup error: {e}")
        return False

def setup_with_supabase_client():
    """Fallback: Setup using Supabase client"""
    print("\n🎯 Supabase Client Setup (Fallback)")
    print("=" * 40)
    
    try:
        from supabase import create_client, Client
        
        load_dotenv()
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            print("❌ Supabase credentials missing")
            return False
        
        print("📡 Connecting to Supabase...")
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase!")
        
        # Check if tables exist
        print("🔍 Checking existing tables...")
        
        try:
            response = supabase.table("users").select("id").limit(1).execute()
            print("✅ Users table exists")
            users_exist = True
        except:
            print("❌ Users table missing")
            users_exist = False
        
        try:
            response = supabase.table("documents").select("id").limit(1).execute()
            print("✅ Documents table exists")
            docs_exist = True
        except:
            print("❌ Documents table missing")
            docs_exist = False
        
        if users_exist and docs_exist:
            print("🎉 All tables exist! Database is ready.")
            return True
        else:
            print("⚠️  Some tables missing. Manual setup required.")
            return False
            
    except Exception as e:
        print(f"❌ Supabase client error: {e}")
        return False

def main():
    print("🚀 Intellinotes Database Setup (Multiple Approaches)")
    print("=" * 55)
    
    # Try direct connection first
    if setup_with_direct_connection():
        print("\n🎉 Setup completed via direct connection!")
        return
    
    print("\n" + "=" * 55)
    
    # Fallback to Supabase client
    if setup_with_supabase_client():
        print("\n🎉 Verification completed via Supabase client!")
        return
    
    # Manual setup instructions
    print("\n" + "=" * 55)
    print("📋 Manual Setup Required")
    print("=" * 25)
    print("Since automatic setup failed, please:")
    print("1. Go to https://supabase.com/dashboard")
    print("2. Open your Intellinotes project")
    print("3. Navigate to SQL Editor")
    print("4. Copy and paste the contents of database_schema.sql")
    print("5. Click 'Run' to execute")
    print("6. Run 'python3 setup_simple.py' to verify")

if __name__ == "__main__":
    main()
