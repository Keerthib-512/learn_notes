#!/usr/bin/env python3
"""
Direct Database Connection Script for Intellinotes
Attempts to create tables using direct PostgreSQL connection
"""

import os
from dotenv import load_dotenv

def create_tables_direct():
    """Create tables using direct PostgreSQL connection"""
    try:
        # Try to import psycopg2
        try:
            import psycopg2
            from psycopg2 import sql
        except ImportError:
            print("❌ psycopg2 not installed")
            print("💡 Install with: pip install psycopg2-binary")
            return False
        
        # Load environment variables
        load_dotenv()
        
        # Connection details
        connection_details = {
            'host': 'db.vtvskrxvozfotnglxaea.supabase.co',
            'port': '5432',
            'database': 'postgres',
            'user': 'postgres',
            'password': os.getenv('SUPABASE_DB_PASSWORD')  # You need to set this
        }
        
        if not connection_details['password']:
            print("❌ SUPABASE_DB_PASSWORD not set in environment")
            print("💡 Add SUPABASE_DB_PASSWORD=your_password to .env file")
            return False
        
        print("📡 Connecting directly to PostgreSQL...")
        conn = psycopg2.connect(**connection_details)
        cursor = conn.cursor()
        print("✅ Connected successfully!")
        
        # Read SQL schema
        schema_path = "database_schema.sql"
        if not os.path.exists(schema_path):
            print(f"❌ Schema file not found: {schema_path}")
            return False
        
        with open(schema_path, 'r') as f:
            sql_content = f.read()
        
        print("🔧 Executing database schema...")
        cursor.execute(sql_content)
        conn.commit()
        print("✅ Schema executed successfully!")
        
        # Close connection
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Direct connection error: {e}")
        return False

def main():
    print("🎯 Intellinotes Direct Table Creation")
    print("=" * 40)
    
    if create_tables_direct():
        print("🎉 Tables created successfully via direct connection!")
    else:
        print("❌ Direct table creation failed")
        print("\n💡 Alternative approaches:")
        print("1. Use Supabase dashboard SQL Editor")
        print("2. Use a PostgreSQL client like pgAdmin")
        print("3. Run: python3 setup_simple.py (for verification only)")

if __name__ == "__main__":
    main()
