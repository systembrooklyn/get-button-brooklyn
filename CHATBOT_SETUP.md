# AI Chatbot System Setup Guide

## Overview

This project includes a complete AI chatbot creation and testing system with the following features:

- User authentication (Supabase)
- Chatbot creation with system prompts and data sources
- 30 trial messages per chatbot
- Real-time chat interface with Groq LLM
- Message tracking and limit enforcement
- Dark/Light theme support

## Prerequisites

- Node.js 18+
- Supabase account with PostgreSQL database
- Groq API key

## Installation Steps

### 1. Environment Setup

Copy `.env.local.example` to `.env.local` and fill in your values:

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Edit `.env.local` with:

- **Supabase**: Your project URL and API keys
- **Database**: PostgreSQL connection strings from Supabase
- **Groq**: Your Groq API key (get it at https://console.groq.com)

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Database Migration

Run the migration script to create tables and RLS policies:

\`\`\`bash
npm run db:migrate
\`\`\`

Or manually execute the SQL in `scripts/01-init-chatbots.sql` in your Supabase SQL editor.

### 4. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000/app/login`

## User Flow

### 1. Authentication

- User signs up at `/app/signup`
- After login, redirected to `/app/profile`
- Navbar shows user email and theme toggle

### 2. Chatbot Creation

- Navigate to "AI Chatbots" from navbar
- Click "Create Chatbot" button
- Fill 3-step form:
  - **General**: Name, tagline, greeting message
  - **Data Sources**: Website URL for bot training
  - **Prompt**: System instructions for AI behavior
- One chatbot per user limit

### 3. Testing the Chatbot

- From chatbot dashboard, click "Test Chatbot"
- Chat interface appears at `/app/test?botId={id}`
- 30 trial messages included
- Messages tracked in real-time
- After limit, user must upgrade (future feature)

## File Structure

\`\`\`
app/
├── app/
│ ├── login/page.js # Login page
│ ├── signup/page.js # Signup page
│ ├── profile/page.js # User profile
│ ├── chatbot/page.js # Chatbot dashboard
│ └── test/page.js # Chat test interface
├── api/
│ └── chat/route.js # Groq API endpoint
├── actions/
│ ├── auth.js # Auth server actions
│ └── chatbot-actions.js # Chatbot CRUD operations
components/
├── navbar.js # Header with theme toggle
├── create-chatbot-modal.js # Chatbot creation form
└── theme-provider.js # Theme context provider
utils/
└── supabase/
├── client.js # Browser Supabase client
├── server.js # Server Supabase client
└── middleware.js # Auth middleware
prisma/
└── schema.prisma # Database schema
scripts/
└── 01-init-chatbots.sql # Database migration
\`\`\`

## Key Features

### Design System

- Modern minimal aesthetic
- **Prominent blue (#2563eb / #3b82f6)** for CTAs and accents
- Dark and light theme support
- Smooth transitions
- Tailwind CSS v4 with custom theme variables

### Authentication

- Supabase Auth (email/password)
- Middleware protection on `/app/*` routes
- Auto-redirect to login for unauthenticated users
- User session management

### Chatbot Features

- One chatbot per user
- Customizable system prompt
- Website URL data source
- 30 trial messages
- Real-time message counting
- Groq LLM integration (`llama-3.3-70b-versatile`)

### Database

- PostgreSQL with Row Level Security (RLS)
- Supabase vector storage ready
- Cascading deletes
- Indexed queries for performance

## API Routes

### POST `/api/chat`

Send a message to the chatbot

**Request:**
\`\`\`json
{
"message": "Hello!",
"chatbotId": "bot-id-here"
}
\`\`\`

**Response:**
\`\`\`json
{
"message": "AI response here"
}
\`\`\`

**Errors:**

- `401`: Not authenticated
- `404`: Chatbot not found
- `429`: Message limit exceeded

## Next Steps

### Upcoming Features

1. **Billing Integration** (Stripe)
2. **File Upload** (3MB limit for training data)
3. **Chatbot Analytics**
4. **Custom Branding** for embedded chat widget
5. **API Keys** for developers
6. **Message History Export**

### Development

- All components use modern JavaScript (no TypeScript)
- Server actions for secure operations
- Client-side state with React hooks
- Responsive design with Tailwind CSS

## Troubleshooting

### Messages not sending?

- Check GROQ_API_KEY in .env.local
- Verify chatbot message count < 30
- Check browser console for errors

### Database connection failing?

- Verify DATABASE_URL and DIRECT_URL in .env.local
- Run migration script: `npm run db:migrate`
- Check Supabase project is active

### Auth not working?

- Clear browser cookies
- Verify SUPABASE_URL and keys
- Check Supabase Auth is enabled

## Support

For issues or questions, check:

- Supabase docs: https://supabase.com/docs
- Groq API docs: https://console.groq.com/docs
- Next.js docs: https://nextjs.org/docs
