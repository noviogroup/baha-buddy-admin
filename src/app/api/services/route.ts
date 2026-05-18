import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// Returns the complete service health and connection status
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    // All services and their Edge Functions
    const services = [
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        edgeFunctions: ['claude-chat-proxy'],
        secretKeys: ['ANTHROPIC_API_KEY'],
        pricingModel: 'Per token',
        pricing: 'Sonnet 4.5: $3/$15 per 1M tokens | Haiku 4.5: $1/$5 | Prompt caching: 90% savings',
        usage: 'User-facing chat, trip planning, tool use orchestration',
      },
      {
        id: 'liteapi',
        name: 'LiteAPI (Hotels)',
        edgeFunctions: ['hotels-stays-proxy'],
        secretKeys: ['LITEAPI_API_KEY', 'INTERNAL_API_SECRET'],
        pricingModel: 'Per booking',
        pricing: 'Search: free | Rates: free | Prebook: free | Book: commission-based',
        usage: 'Hotel search, live rates, prebook + book flow',
      },
      {
        id: 'viator',
        name: 'Viator (Activities)',
        edgeFunctions: ['activities-proxy'],
        secretKeys: ['VIATOR_API_KEY', 'INTERNAL_API_SECRET'],
        pricingModel: 'Per booking (affiliate)',
        pricing: 'API access: free | Booking: 8% affiliate commission (or merchant model)',
        usage: 'Activity search, details, availability, hold + book',
      },
      {
        id: 'duffel',
        name: 'Duffel (Flights)',
        edgeFunctions: ['flights-proxy', 'flights-book'],
        secretKeys: ['DUFFEL_API_TOKEN'],
        pricingModel: 'Per booking',
        pricing: 'Search: free | Book: $1\u20133 per booking segment',
        usage: 'Flight search + booking with airline consolidator',
      },
      {
        id: 'deepgram',
        name: 'Deepgram (STT)',
        edgeFunctions: ['stt-proxy'],
        secretKeys: ['DEEPGRAM_API_KEY'],
        pricingModel: 'Per minute',
        pricing: 'Nova-3: $0.0043/min (pay-as-you-go) | Free: $200 initial credit',
        usage: 'Voice input transcription (Speech-to-Text)',
      },
      {
        id: 'openai',
        name: 'OpenAI (TTS)',
        edgeFunctions: ['tts-proxy'],
        secretKeys: ['OPENAI_API_KEY'],
        pricingModel: 'Per character',
        pricing: 'TTS-1: $15/1M chars | TTS-1-HD: $30/1M chars',
        usage: "Buddy's voice output (Text-to-Speech)",
      },
      {
        id: 'stripe',
        name: 'Stripe (Payments)',
        edgeFunctions: ['stripe-payment', 'stripe-webhook'],
        secretKeys: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
        pricingModel: 'Per transaction',
        pricing: '2.9% + 30\u00a2 per successful charge | Test mode: free',
        usage: 'Payment processing, customer management, webhooks',
      },
      {
        id: 'open_meteo',
        name: 'Open-Meteo (Weather)',
        edgeFunctions: ['weather-proxy'],
        secretKeys: [],
        pricingModel: 'Free',
        pricing: 'Free for non-commercial. 10k requests/day rate limit.',
        usage: 'Current weather + 7-day forecast for islands',
      },
      {
        id: 'supabase',
        name: 'Supabase',
        edgeFunctions: ['All functions use Supabase'],
        secretKeys: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'],
        pricingModel: 'Monthly plan',
        pricing: 'Pro: $25/mo | Edge Function invocations, storage, egress metered',
        usage: 'Database, auth, realtime, storage, Edge Functions',
      },
    ];

    // Try to get credit status from DB
    let credits: any[] = [];
    try {
      const { data } = await supabase.from('api_credit_status').select('*');
      credits = data || [];
    } catch { /* table may not exist */ }

    // Merge DB credit data with service definitions
    const merged = services.map(svc => {
      const credit = credits.find((c: any) => c.service === svc.id);
      return {
        ...svc,
        credit: credit || null,
      };
    });

    return NextResponse.json({ services: merged });
  } catch (err: any) {
    console.error('Services API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
