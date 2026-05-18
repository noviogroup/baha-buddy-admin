# Baha Buddy Admin Panel

## What This Is
Internal admin dashboard for Baha Buddy V2. Connects to the same Supabase project as the Flutter V2 app. Runs on port 3001.

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (white primary, Poppins font, zinc neutral palette)
- Supabase JS client (Service Role Key server-side)
- Recharts for data visualization
- Lucide React for icons

## Setup
```bash
npm install
cp .env.example .env.local   # Add Supabase URL + keys
npm run dev                   # → http://localhost:3001
```
Run migrations in Supabase SQL Editor:
- `migrations/20260308_admin_support_tables.sql`
- `migrations/20260308_api_cost_tracking.sql`

## API Routes (12 total)
| Route | Purpose |
|-------|---------|
| `/api/stats` | Aggregate KPIs (users, trips, revenue, AI costs) |
| `/api/users` | User list with search + pagination |
| `/api/user-detail?id=` | Full user profile + trips + bookings + AI spend + threads |
| `/api/trips` | Trip list with status filtering |
| `/api/bookings` | Booking list with status filtering |
| `/api/ai` | AI cost data from ai_usage_log + views |
| `/api/billing` | Combined billing: AI + API costs + credits + Stripe revenue |
| `/api/services` | Service registry: all 9 APIs with Edge Function mapping |
| `/api/chat-threads` | Thread list + message viewer for admin chat inspection |
| `/api/support` | Support ticket CRUD with admin reply |
| `/api/ugc` | UGC moderation queue (list pending, approve/reject) |
| `/api/activity-feed` | Live feed: signups, trips, bookings, messages (24h) |

## Dashboard Pages (8 tabs)
1. **Overview** — KPIs, trip status pie, metrics, islands, live activity feed (24h)
2. **Users** — Searchable table + click-to-open detail drawer (profile, trips, bookings, AI spend, threads)
3. **Trips** — Filterable by status
4. **Chat & AI** — Cost charts, top users, AI log + chat thread viewer (read any conversation)
5. **Bookings** — Booking list by type/status
6. **Billing & APIs** — Full cost/credit tracking for all 9 services
7. **Support** — Ticket queue + thread view + admin reply
8. **Content** — Sanity CMS link + UGC moderation queue (approve/reject)

## Security
- Service Role Key server-side only
- No admin auth yet — add before production
