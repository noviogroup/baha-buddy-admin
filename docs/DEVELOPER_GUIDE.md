# Baha Buddy Admin Panel — Developer Guide

## Quick Start

```bash
cd Baha-Buddy-Admin
npm install                    # already done
cp .env.example .env.local     # already done — keys added
npm run dev                    # → http://localhost:3001
```

## Project Structure

```
Baha-Buddy-Admin/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main dashboard — all 8 page views
│   │   ├── layout.tsx         # Root layout, metadata
│   │   ├── globals.css        # Tailwind + Poppins font + scrollbar styles
│   │   └── api/               # Next.js API routes (server-side, Service Role Key)
│   │       ├── stats/         # Aggregate KPIs across all tables
│   │       ├── users/         # User list with search + pagination
│   │       ├── trips/         # Trip list with status filtering
│   │       ├── bookings/      # Booking list with status filtering
│   │       ├── ai/            # AI cost data from ai_usage_log + views
│   │       ├── billing/       # Combined billing: AI + API costs + credits + Stripe revenue
│   │       ├── services/      # Service registry: all 9 APIs mapped to Edge Functions
│   │       └── support/       # Support ticket CRUD with admin reply
│   ├── lib/
│   │   ├── supabase.ts        # Admin (Service Role) + Browser Supabase clients
│   │   └── types.ts           # Full TypeScript types matching V2 database schema
│   └── components/            # Shared components (ready for extraction)
├── migrations/
│   ├── 20260308_admin_support_tables.sql   # support_tickets + support_messages
│   └── 20260308_api_cost_tracking.sql      # api_usage_log + api_credit_status + views
├── docs/                      # You are here
├── tailwind.config.js         # Poppins font, neutral theme
├── package.json               # Next.js 14 + Supabase + Recharts + Tailwind
└── .env.local                 # Supabase URL + keys (gitignored)
```

## Dashboard Pages

| Page | Sidebar Label | API Route | What It Shows |
|------|--------------|-----------|---------------|
| Overview | Overview | `/api/stats` | KPIs, trip status pie, key metrics, island popularity |
| Users | Users | `/api/users` | Searchable user table, engagement scores, interests |
| Trips | Trips | `/api/trips` | Filterable by status, islands, dates, budget |
| Chat & AI | Chat & AI | `/api/ai` | Model cost chart, top users by cost, log entries |
| Bookings | Bookings | `/api/bookings` | Booking list by type/status, revenue |
| Billing & APIs | Billing & APIs | `/api/billing` + `/api/services` | All 9 service costs, credits, key status, dashboards |
| Support | Support | `/api/support` | Ticket queue, thread view, admin reply |
| Content | Content | — | Sanity CMS link, UGC moderation placeholder |

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=       # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Anon key (client-side, respects RLS)
SUPABASE_SERVICE_ROLE_KEY=      # Service role key (server-side only, bypasses RLS)
```

The Service Role Key is used exclusively in API routes via `createAdminClient()`. It never reaches the browser.

## Database Dependencies

The admin panel reads from these existing V2 tables:
- `users`, `trips`, `bookings`, `chat_threads`, `chat_messages`
- `trip_accommodations`, `trip_flights`, `trip_activities`
- `ai_usage_log` + views `ai_daily_costs`, `ai_user_costs_30d`
- `google_places`, `ugc_content`

And these new admin tables (run the migrations):
- `support_tickets`, `support_messages`
- `api_usage_log`, `api_credit_status`
- Views: `api_daily_usage`, `all_daily_costs`, `stripe_revenue_summary`

## Running Migrations

In Supabase SQL Editor, run in order:
1. `migrations/20260308_admin_support_tables.sql`
2. `migrations/20260308_api_cost_tracking.sql`

These are idempotent — safe to run multiple times.

## Adding New Pages

1. Add the page ID to the `Page` type union in `page.tsx`
2. Create the component function (e.g. `function NewPage()`)
3. Add it to the `NAV` array
4. Add a `case` in `renderPage()`
5. If it needs data, create an API route in `src/app/api/yourpage/route.ts`

## Tech Decisions

- **Single-file dashboard**: All pages live in `page.tsx` for simplicity during early development. Extract into separate files when any page exceeds ~150 lines.
- **Server-side data**: All API routes use the Service Role Key to bypass RLS, giving admin full visibility across all users.
- **No admin auth yet**: The dashboard is open. Before production, add authentication (Supabase Auth with admin role check, or a simple password gate).
