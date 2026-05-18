# API & Service Integration Map

Every external API used by Baha Buddy V2, which Edge Function proxies it, what secrets it needs, and how costs work.

## Service Registry

### 1. Anthropic Claude (AI Chat)
- **Edge Function**: `claude-chat-proxy`
- **Secrets**: `ANTHROPIC_API_KEY`
- **Pricing**: Sonnet 4.5 — $3 input / $15 output per 1M tokens. Haiku 4.5 — $1/$5.
- **Cost tracking**: Every request logged to `ai_usage_log` with input/output tokens + estimated cost.
- **Views**: `ai_daily_costs` (daily by model), `ai_user_costs_30d` (per-user 30-day rollup)
- **Dashboard**: https://console.anthropic.com/settings/billing

### 2. LiteAPI (Hotels)
- **Edge Function**: `hotels-stays-proxy`
- **Secrets**: `LITEAPI_API_KEY`, `INTERNAL_API_SECRET`
- **Actions**: `search_hotels`, `get_hotel_details`, `get_hotel_rates`, `get_reviews`, `prebook`, `book`
- **Pricing**: Search/rates free. Booking is commission-based.
- **Status**: Sandbox key — switch to live before launch.
- **Dashboard**: https://dashboard.liteapi.travel

### 3. Viator (Activities)
- **Edge Function**: `activities-proxy`
- **Secrets**: `VIATOR_API_KEY`, `INTERNAL_API_SECRET`
- **Actions**: `search_activities`, `get_activity`, `check_availability`, `hold_booking`, `book_activity`, `cancel_booking`
- **Pricing**: API free. 8% affiliate commission on bookings (merchant model pending).
- **Status**: Sandbox key — awaiting Merchant key for direct booking. Currently returns affiliate links.
- **Dashboard**: https://partnerportal.viator.com

### 4. Duffel (Flights)
- **Edge Functions**: `flights-proxy` (search), `flights-book` (create order)
- **Secrets**: `DUFFEL_API_TOKEN`
- **Pricing**: Search free. $1–3 per booking segment.
- **Status**: Test mode — production approval required.
- **Dashboard**: https://app.duffel.com

### 5. Deepgram (Speech-to-Text)
- **Edge Function**: `stt-proxy`
- **Secrets**: `DEEPGRAM_API_KEY`
- **Model**: Nova-3
- **Pricing**: $0.0043/min (pay-as-you-go). $200 free credit on signup.
- **Dashboard**: https://console.deepgram.com

### 6. OpenAI (Text-to-Speech)
- **Edge Function**: `tts-proxy`
- **Secrets**: `OPENAI_API_KEY`
- **Model**: TTS-1, voice `onyx`
- **Pricing**: $15/1M characters (TTS-1), $30/1M (TTS-1-HD)
- **Dashboard**: https://platform.openai.com/usage

### 7. Stripe (Payments)
- **Edge Functions**: `stripe-payment` (create PaymentIntent), `stripe-webhook` (handle events)
- **Secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Pricing**: 2.9% + 30¢ per successful charge (production). Free in test mode.
- **Dashboard**: https://dashboard.stripe.com

### 8. Open-Meteo (Weather)
- **Edge Function**: `weather-proxy`
- **Secrets**: None (free, no API key)
- **Pricing**: Free for non-commercial. 10k requests/day rate limit.
- **Dashboard**: https://open-meteo.com

### 9. Supabase (Backend)
- **Edge Functions**: All functions
- **Secrets**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- **Plan**: Pro ($25/mo)
- **Metered**: Edge Function invocations, database size, storage, egress
- **Dashboard**: https://supabase.com/dashboard

## Edge Function Secret Summary

All secrets are set with `supabase secrets set KEY=value`. Full list:

```
ANTHROPIC_API_KEY          # Claude AI
LITEAPI_API_KEY            # Hotel search/booking
VIATOR_API_KEY             # Activity search/booking
DUFFEL_API_TOKEN           # Flight search/booking
DEEPGRAM_API_KEY           # Speech-to-text
OPENAI_API_KEY             # Text-to-speech
STRIPE_SECRET_KEY          # Payment processing
STRIPE_WEBHOOK_SECRET      # Payment webhook verification
INTERNAL_API_SECRET        # Edge Function → Edge Function auth
SUPABASE_URL               # Auto-set by Supabase
SUPABASE_SERVICE_ROLE_KEY  # Auto-set by Supabase
SUPABASE_ANON_KEY          # Auto-set by Supabase
```

## Cost Tracking Architecture

```
User interaction
    │
    ▼
claude-chat-proxy ──→ ai_usage_log (per-request token count + cost)
    │                      │
    ├─ get_hotels ───→ hotels-stays-proxy ──→ api_usage_log
    ├─ get_activities → activities-proxy ───→ api_usage_log
    ├─ search_flights → flights-proxy ─────→ api_usage_log
    │
    ▼
Admin Panel reads:
    ai_daily_costs view      (AI costs by model per day)
    ai_user_costs_30d view   (AI costs by user, 30-day)
    api_daily_usage view     (API costs by service per day)
    all_daily_costs view     (Combined AI + API daily)
    stripe_revenue_summary   (Revenue from confirmed bookings)
    api_credit_status table  (Credit balances, key status, plan tiers)
```
