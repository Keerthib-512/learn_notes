# Intellinotes Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- Supabase account
- OpenAI API key
- SendGrid account

### 1. Setup Environment

```bash
# Clone and setup
git clone <your-repo>
cd intellinotes
chmod +x setup.sh
./setup.sh
```

### 2. Configure Environment Variables

#### Backend (.env)
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key

# Supabase Configuration  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# SendGrid Configuration
SENDGRID_API_KEY=SG.your-sendgrid-key

# JWT Configuration
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Configuration
FROM_EMAIL=noreply@intellinotes.com
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy URL and keys

#### Run Database Schema
Execute the SQL in `backend/database_schema.sql` in your Supabase SQL editor.

#### Create Storage Bucket
In Supabase dashboard, go to Storage → Create bucket:
- Name: `documents`
- Public: Yes

### 4. Email Setup (SendGrid)

1. Create SendGrid account
2. Create API key with Mail Send permissions
3. Verify sender email in SendGrid dashboard

### 5. Start Development

#### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload
```

#### Terminal 2 - Frontend  
```bash
cd frontend
npm run dev
```

Application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📋 Application Features

### 🔐 Authentication
- User registration with email verification
- Secure login/logout
- Password reset functionality
- JWT-based authentication

### 📄 Document Processing
- Support for PDF, Word, and text files
- AI-powered summarization using OpenAI GPT
- Automatic text extraction
- File validation and security

### 🎧 Audio Learning
- Text-to-speech conversion using gTTS
- Multiple voice styles (calm, explanatory, soft)
- Podcast-style script generation
- Audio player with controls

### 📊 Visual Learning
- AI-generated flowcharts and diagrams
- Interactive graph visualization
- Concept mapping
- Visual summary representation

### 💾 Export & Save
- Download summaries as text files
- Local storage of learning materials
- Document management and organization

## 🏗️ Architecture

```
intellinotes/
├── frontend/                 # Next.js React app
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # Reusable components
│   │   ├── lib/            # API client & utilities
│   │   └── types/          # TypeScript definitions
├── backend/                 # FastAPI Python backend
│   ├── api/routes/         # API endpoints
│   ├── core/               # Config & database
│   ├── services/           # Business logic
│   └── models/             # Data schemas
└── docs/                   # Documentation
```

## 🚀 Production Deployment

### Backend Deployment (Railway/Heroku)

1. **Prepare for deployment:**
```bash
# Add Procfile for Heroku
echo "web: uvicorn main:app --host=0.0.0.0 --port=\$PORT" > backend/Procfile

# Add runtime.txt
echo "python-3.9.18" > backend/runtime.txt
```

2. **Deploy to Heroku:**
```bash
cd backend
heroku create your-app-name-api
heroku config:set OPENAI_API_KEY=your-key
heroku config:set SUPABASE_URL=your-url
# ... set all environment variables
git add .
git commit -m "Deploy backend"
git push heroku main
```

### Frontend Deployment (Vercel)

1. **Connect to Vercel:**
```bash
cd frontend
npm install -g vercel
vercel
```

2. **Set environment variables in Vercel dashboard**

3. **Update API URL:**
In `frontend/src/lib/api.ts`, update production URL:
```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-app.herokuapp.com/api'
  : 'http://localhost:8000/api';
```

## 🔧 Configuration Options

### AI Model Configuration
```python
# In backend/services/ai_service.py
llm = OpenAI(
    temperature=0.3,      # Creativity (0-1)
    max_tokens=2000,      # Response length
    model="gpt-3.5-turbo-instruct"  # Model version
)
```

### File Upload Limits
```python
# In backend/core/config.py
max_file_size: int = 50 * 1024 * 1024  # 50MB
allowed_file_types: list = [".pdf", ".docx", ".txt"]
```

### Authentication Settings
```python
# In backend/core/config.py
access_token_expire_minutes: int = 30
secret_key: str = "your-secret-key"
```

## 🐛 Troubleshooting

### Common Issues

1. **Module not found errors:**
```bash
# Install missing dependencies
pip install -r requirements.txt
npm install
```

2. **Database connection errors:**
- Verify Supabase URL and keys
- Check if database schema is applied
- Ensure RLS policies are enabled

3. **File upload errors:**
- Check file size limits
- Verify allowed file types
- Ensure uploads directory exists

4. **TTS generation fails:**
- Check internet connection
- Verify gTTS installation
- Check audio directory permissions

### Debug Mode

Enable debug logging:
```python
# In backend/main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Performance Optimization

1. **Backend optimizations:**
```python
# Use async/await for all I/O operations
# Implement connection pooling for database
# Add caching for frequently accessed data
```

2. **Frontend optimizations:**
```typescript
// Use React.memo for expensive components
// Implement lazy loading for large components
// Optimize images and assets
```

## 📊 Monitoring

### Health Checks
- Backend: `GET /health`
- Database: Monitor Supabase dashboard
- File storage: Check disk usage

### Logging
- Application logs: Check deployment platform logs
- Error tracking: Consider Sentry integration
- Performance monitoring: Use APM tools

## 🔒 Security Considerations

1. **Environment Variables:**
   - Never commit secrets to version control
   - Use different keys for production
   - Rotate API keys regularly

2. **File Upload Security:**
   - Validate file types and sizes
   - Scan for malicious content
   - Use secure file storage

3. **Authentication:**
   - Use strong JWT secrets
   - Implement rate limiting
   - Enable HTTPS in production

## 📈 Scaling

### Horizontal Scaling
- Deploy multiple backend instances
- Use load balancer
- Implement Redis for session storage

### Database Scaling
- Use Supabase read replicas
- Implement database connection pooling
- Consider caching layer

### File Storage Scaling
- Use CDN for static assets
- Implement file compression
- Consider cloud storage (AWS S3)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

For support, email: support@intellinotes.com 