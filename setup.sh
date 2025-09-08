#!/bin/bash

# Intellinotes Setup Script
echo "🚀 Setting up Intellinotes Application..."
echo "======================================="

# Create directory structure
echo "📁 Creating directory structure..."

# Backend directories
mkdir -p backend/api/routes
mkdir -p backend/core
mkdir -p backend/models
mkdir -p backend/services
mkdir -p backend/utils
mkdir -p backend/uploads
mkdir -p backend/static/audio

# Frontend directories
mkdir -p frontend/src/app/auth/login
mkdir -p frontend/src/app/auth/signup
mkdir -p frontend/src/app/dashboard
mkdir -p frontend/src/components/ui
mkdir -p frontend/src/components/auth
mkdir -p frontend/src/components/dashboard
mkdir -p frontend/src/lib
mkdir -p frontend/src/types
mkdir -p frontend/src/hooks

echo "✅ Directory structure created!"

# Backend setup
echo "🐍 Setting up Backend..."
cd backend

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Backend setup complete!"
cd ..

# Frontend setup
echo "⚛️ Setting up Frontend..."
cd frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

echo "✅ Frontend setup complete!"
cd ..

# Environment files
echo "📄 Creating environment files..."

# Backend environment
cat > backend/.env << EOL
# Copy from env.example and update with your actual values
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here
SECRET_KEY=your_secret_key_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FROM_EMAIL=noreply@intellinotes.com
EOL

# Frontend environment
cat > frontend/.env.local << EOL
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EOL

echo "🔧 Configuration Instructions:"
echo "================================"
echo "1. Update backend/.env with your actual API keys:"
echo "   - OpenAI API key"
echo "   - Supabase URL and service key"
echo "   - SendGrid API key"
echo ""
echo "2. Update frontend/.env.local with your Supabase credentials"
echo ""
echo "3. Run the database schema in your Supabase dashboard:"
echo "   - Execute the SQL in backend/database_schema.sql"
echo ""
echo "4. Start the applications:"
echo "   Backend: cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🎉 Setup complete! Follow the configuration instructions above." 