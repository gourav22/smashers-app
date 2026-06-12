# Smashers Club - Sports Management App

A Next.js 16 PWA for managing badminton and cricket clubs with ELO rankings, subscription management, and auto-booking.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Visit http://localhost:3000

## 📋 Documentation

- **[Setup Guide](docs/SETUP.md)** - Initial setup and configuration
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy to Vercel
- **[Features Overview](docs/FEATURES.md)** - Complete feature list

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS v4
- **PWA:** Service Worker, Web Push, Offline Support

## 📦 Key Features

- 🎾 Slot booking with balance system (£4 per booking)
- 📊 ELO rating system (badminton & cricket)
- 🔄 Template-based subscriptions with auto-booking
- 📱 Progressive Web App (offline, install, notifications)
- 🏆 Leaderboards and user grades (A+, A, B+, B, C)
- ⚡ Match management with admin approval

## 🗄️ Database Setup

Run SQL files in order in your Supabase SQL Editor:

1. `sql/migrations/01-base-schema.sql` - Core tables
2. `sql/migrations/02-subscription-system.sql` - Subscription system

## 🔐 Environment Variables

Required in Vercel dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## 📝 License

Private project for Smashers Club.
