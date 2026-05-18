# Deployment & Security Checklist

## Before Going Live

### Authentication
- [ ] Add admin authentication to the dashboard (Supabase Auth with admin role, or password gate)
- [ ] The dashboard currently has NO auth — anyone with the URL can access it
- [ ] Consider IP allowlisting for the admin panel in production

### API Keys
- [ ] Rotate Supabase Service Role Key (V1 exposure from .env.local)
- [ ] Switch LiteAPI from sandbox to live key
- [ ] Switch Viator from sandbox to production key
- [ ] Switch Duffel from test to live mode (requires approval)
- [ ] Switch Stripe from test to live mode
- [ ] Verify all keys are set as Supabase Edge Function secrets, not in client code
- [ ] Domain-restrict Google Maps API key in Google Cloud Console

### Database
- [ ] Run `migrations/20260308_admin_support_tables.sql` in Supabase SQL Editor
- [ ] Run `migrations/20260308_api_cost_tracking.sql` in Supabase SQL Editor
- [ ] Verify RLS policies are active on all tables
- [ ] Test that admin API routes work with Service Role Key

### Monitoring
- [ ] Set budget alerts on Anthropic console
- [ ] Set budget alerts on OpenAI platform
- [ ] Set up Supabase usage alerts (egress, Edge Function invocations)
- [ ] Configure Stripe webhook URL for production domain
- [ ] Set up UptimeRobot or similar for Supabase health monitoring

### Deployment
- [ ] Deploy to Vercel (or similar) with environment variables set
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and keys in Vercel env vars
- [ ] Ensure CORS on Edge Functions allows the admin panel domain
- [ ] Test all 8 dashboard pages load correctly in production

## Monthly Operational Tasks

- [ ] Review AI costs in Billing & APIs page — check for unexpected spikes
- [ ] Update `api_credit_status` table with current balances from provider dashboards
- [ ] Review support ticket backlog — resolve or escalate stale tickets
- [ ] Check Edge Function error rates in Supabase dashboard
- [ ] Review user growth trends and engagement score distribution
- [ ] Audit top AI cost users — check for abuse patterns
