#!/usr/bin/env python3
"""
Simple Database Setup Script for Intellinotes
Verifies database connection and table existence
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

def update_env_file():
    """Update .env file with real email sending enabled"""
    env_path = ".env"
    
    # Read current .env file
    env_content = ""
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            env_content = f.read()
    
    # Update MOCK_EMAIL_SENDING to false
    if "MOCK_EMAIL_SENDING=true" in env_content:
        env_content = env_content.replace("MOCK_EMAIL_SENDING=true", "MOCK_EMAIL_SENDING=false")
        with open(env_path, 'w') as f:
            f.write(env_content)
        print("✅ Environment file updated successfully!")
    elif "MOCK_EMAIL_SENDING=false" in env_content:
        print("✅ Environment file already configured for real emails!")
    else:
        # Add the setting if it doesn't exist
        with open(env_path, 'a') as f:
            f.write("\nMOCK_EMAIL_SENDING=false\n")
        print("✅ Environment file updated successfully!")

def test_backend_config():
    """Test if backend configuration is valid"""
    try:
        # Load environment variables
        load_dotenv()
        
        # Check required environment variables
        required_vars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'OPENAI_API_KEY',
            'SENDGRID_API_KEY',
            'JWT_SECRET_KEY'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
            return False
        
        print("✅ Backend configuration is valid!")
        return True
        
    except Exception as e:
        print(f"❌ Backend configuration error: {e}")
        return False

def check_database():
    """Check if database tables exist"""
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
        
        print("🔍 Checking existing tables...")
        
        # Check if users table exists
        try:
            response = supabase.table("users").select("id").limit(1).execute()
            print("✅ Users table already exists!")
            users_exist = True
        except Exception as e:
            if "does not exist" in str(e):
                print("❌ Users table does not exist")
                users_exist = False
            else:
                print(f"❌ Error checking users table: {e}")
                return False
        
        # Check if documents table exists
        try:
            response = supabase.table("documents").select("id").limit(1).execute()
            print("✅ Documents table already exists!")
            documents_exist = True
        except Exception as e:
            if "does not exist" in str(e):
                print("❌ Documents table does not exist")
                documents_exist = False
            else:
                print(f"❌ Error checking documents table: {e}")
                return False
        
        if users_exist and documents_exist:
            print("🎉 All tables already exist! Database is ready.")
            return True
        else:
            print("❌ Some tables are missing. Please create them manually in Supabase.")
            return False
            
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def main():
    print("🎯 Intellinotes Simple Database Setup")
    print("=" * 40)
    
    # Update environment file
    print("📝 Updating environment file...")
    update_env_file()
    
    # Test backend configuration
    print("\n🧪 Testing backend configuration...")
    if not test_backend_config():
        print("❌ Setup failed due to configuration issues")
        return
    
    # Check database
    print("\n🚀 Setting up Intellinotes Database...")
    if check_database():
        print("\n🎉 Setup completed successfully!")
        print("Your application is now ready to send real emails!")
    else:
        print("\n❌ Setup failed. Please check your Supabase configuration.")

if __name__ == "__main__":
    main()
