# Baha Buddy Admin Panel

Internal admin dashboard for Baha Buddy V2 — tracking users, trips, AI costs, bookings, support tickets, and content.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Backend:** Supabase (shared with V2 app)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Fonts:** Fraunces (display) + DM Sans (body)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Add your Supabase credentials to .env.local
#    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
#    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 4. Run dev server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) — runs on port 3001 to avoid conflicts with the V2 dev server.

## Architecture

```
src/
  app/             → Next.js App Router pages
  components/      → Shared UI components
  lib/             → Supabase client, types, utilities
```

## Security Notes
- Service Role Key is used server-side only (API routes / Server Components)
- Anon key used client-side for real-time subscriptions
- Admin auth should be added before production deployment
- Never expose the Service Role Key to the client
