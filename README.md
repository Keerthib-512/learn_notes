# Intellinotes - Your Learning Assistant

## 🚀 Overview

**Intellinotes** is a student-centric learning assistant that transforms academic documents (PDFs, Word files, etc.) into audio-based podcasts, textual summaries, and visual representations using AI and ML technologies.

**Tagline**: *"Your notes, your pace, your intelligence – welcome to the future of learning."*

## ✨ Features

- 📄 **Document Processing**: Upload PDF, Word, and text documents
- 🤖 **AI-Powered Summaries**: Generate intelligent summaries using OpenAI
- 🎧 **Text-to-Speech**: Convert summaries to natural speech with playback controls
- 📊 **Visual Representations**: Create flowcharts and diagrams from content
- 👤 **User Authentication**: Secure login with email verification
- 💾 **Save & Export**: Download summaries locally
- 📱 **Responsive Design**: Works on desktop and tablet

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL) |
| AI/ML | OpenAI GPT-3.5, LangChain |
| File Processing | PyMuPDF, python-docx |
| Text-to-Speech | Web Speech API, gTTS |
| Visualization | Mermaid.js, D3.js |
| Authentication | Supabase Auth |
| Email | SendGrid |

## 📋 Prerequisites

- Node.js 18+
- Python 3.9+
- Supabase account
- OpenAI API key
- SendGrid account (for email)

## 🚀 Quick Start

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment Variables

Create `.env.local` in frontend and `.env` in backend directories:

**Frontend (.env.local)**:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend (.env)**:
```
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SENDGRID_API_KEY=your_sendgrid_api_key
```

## 📁 Project Structure

```
intellinotes/
├── frontend/                 # Next.js React application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # Reusable components
│   │   ├── lib/            # Utilities and configurations
│   │   └── types/          # TypeScript type definitions
├── backend/                 # FastAPI Python backend
│   ├── api/                # API routes
│   ├── core/               # Core configurations
│   ├── models/             # Database models
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
└── docs/                   # Documentation
```

## 🔧 Development

1. Start the backend server: `cd backend && uvicorn main:app --reload`
2. Start the frontend: `cd frontend && npm run dev`
3. Open http://localhost:3000

## 📚 API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License. 