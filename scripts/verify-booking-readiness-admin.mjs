#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const SOURCE_CHECKS = [
  {
    file: 'src/app/api/bookings/route.ts',
    required: [
      ".from('v_booking_financials')",
      'enrichBookingRows',
      'loadCanonicalExtras: true',
      'isRecognizedRevenue',
    ],
  },
  {
    file: 'src/app/api/payments/route.ts',
    required: [
      ".from('bookings')",
      'enrichBookingRows',
      'payment_status',
      'provider_status',
      'source_surface',
      'failure_state',
    ],
  },
  {
    file: 'src/app/api/revenue/summary/route.ts',
    required: [
      ".from('bookings')",
      'enrichBookingRows',
      "revenueSource: 'canonical_bookings'",
      'byPaymentStatus',
      'byProviderStatus',
      'byRecoveryState',
    ],
  },
  {
    file: 'src/app/api/support/route.ts',
    required: [
      'loadBookingSupportQueue',
      ".from('bookings')",
      'needsBookingSupport',
      'paymentCapturedProviderFailed',
      'providerSucceededLocalFailed',
      'abandonedCheckout',
      'providerPending',
    ],
  },
  {
    file: 'src/app/api/trips/route.ts',
    required: [
      'loadBookingContextForTrips',
      ".from('bookings')",
      'enrichBookingRows',
      'tripsWithBookingIssues',
    ],
  },
  {
    file: 'src/app/api/users/route.ts',
    required: [
      'loadBookingContextForUsers',
      ".from('bookings')",
      'enrichBookingRows',
      'travelersWithBookingIssues',
    ],
  },
  {
    file: 'src/app/api/trip-detail/route.ts',
    required: [
      ".from('bookings')",
      ".from('trip_accommodations')",
      ".from('trip_flights')",
      ".from('trip_activities')",
      ".order('departure_at'",
      'enrichBookingRowsWithLoadedTripItems',
    ],
  },
  {
    file: 'src/app/api/stats/route.ts',
    required: [
      ".from('bookings')",
      'enrichBookingRows',
      'isRecognizedRevenue',
    ],
  },
];

const REMOTE_CHECKS = [
  {
    relation: 'bookings',
    purpose: 'canonical traveler/admin booking source',
    columns: [
      'id',
      'user_id',
      'trip_id',
      'booking_type',
      'type',
      'provider',
      'reference_id',
      'booking_ref',
      'booking_reference',
      'external_reference',
      'status',
      'amount',
      'amount_cents',
      'gross_booking_value',
      'net_revenue',
      'partner_payout_amount',
      'payout_status',
      'currency',
      'stripe_payment_intent_id',
      'financial_metadata',
      'raw_response',
      'paid_at',
      'created_at',
      'updated_at',
    ],
  },
  {
    relation: 'v_booking_financials',
    purpose: 'admin bookings/revenue financial view',
    columns: [
      'id',
      'user_id',
      'trip_id',
      'booking_type',
      'provider',
      'status',
      'currency',
      'amount',
      'gross_booking_value',
      'net_revenue',
      'partner_payout_amount',
      'gross_margin_after_payout',
      'payout_status',
      'stripe_payment_intent_id',
      'external_reference',
      'reference_id',
      'paid_at',
      'created_at',
      'updated_at',
    ],
  },
  {
    relation: 'trip_accommodations',
    purpose: 'canonical hotel/stay trip items',
    columns: [
      'id',
      'trip_id',
      'place_id',
      'liteapi_hotel_id',
      'liteapi_rate_id',
      'liteapi_prebook_id',
      'name',
      'island',
      'check_in',
      'check_out',
      'photo_url',
      'address',
      'description',
      'property_type',
      'gallery_images',
      'amenities',
      'stars',
      'rating',
      'booking_reference',
      'stripe_payment_intent_id',
      'status',
      'total_price',
      'currency',
      'nights',
      'created_at',
      'updated_at',
    ],
  },
  {
    relation: 'trip_flights',
    purpose: 'canonical flight trip items',
    columns: [
      'id',
      'trip_id',
      'origin',
      'destination',
      'departure_at',
      'arrival_at',
      'airline',
      'booking_reference',
      'price',
      'duffel_offer_id',
      'stripe_payment_intent_id',
      'created_at',
      'updated_at',
    ],
  },
  {
    relation: 'trip_activities',
    purpose: 'canonical activity/explore trip items',
    columns: [
      'id',
      'trip_id',
      'day_number',
      'time_slot',
      'activity_name',
      'activity_type',
      'place_id',
      'source_type',
      'source_id',
      'provider',
      'provider_activity_id',
      'image_url',
      'price',
      'currency',
      'metadata',
      'sort_order',
      'created_at',
      'updated_at',
    ],
  },
  {
    relation: 'support_tickets',
    purpose: 'admin support queue',
    columns: ['id', 'user_id', 'subject', 'status', 'priority', 'assigned_to', 'created_at', 'updated_at'],
  },
  {
    relation: 'users',
    purpose: 'traveler identity for admin users/travelers modules',
    columns: ['id', 'display_name', 'email', 'created_at', 'updated_at'],
  },
  {
    relation: 'trips',
    purpose: 'trip owner and status source',
    columns: ['id', 'user_id', 'name', 'status', 'islands', 'budget_estimate', 'created_at', 'updated_at'],
  },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    const first = value.charCodeAt(0);
    const last = value.charCodeAt(value.length - 1);
    if ((first === 34 && last === 34) || (first === 39 && last === 39)) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function assertSourceContracts() {
  const failures = [];

  for (const check of SOURCE_CHECKS) {
    const filePath = path.join(process.cwd(), check.file);
    if (!fs.existsSync(filePath)) {
      failures.push(`${check.file}: file is missing`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const required of check.required) {
      if (!content.includes(required)) {
        failures.push(`${check.file}: missing source contract marker "${required}"`);
      }
    }
  }

  const apiDir = path.join(process.cwd(), 'src/app/api');
  const auditTableUsages = listFiles(apiDir)
    .filter(file => fs.readFileSync(file, 'utf8').includes('travel_booking_records'))
    .map(file => path.relative(process.cwd(), file));
  if (auditTableUsages.length) {
    failures.push(`travel_booking_records is used by admin API routes: ${auditTableUsages.join(', ')}`);
  }

  if (failures.length) {
    throw new Error(`Admin source contract check failed:\n- ${failures.join('\n- ')}`);
  }

  console.log(`Source contracts verified: ${SOURCE_CHECKS.length} admin API routes use canonical booking sources.`);
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(fullPath));
    if (entry.isFile()) out.push(fullPath);
  }
  return out;
}

async function assertRemoteSchema({ supabaseUrl, serviceRoleKey }) {
  for (const check of REMOTE_CHECKS) {
    const url = new URL(`/rest/v1/${check.relation}`, supabaseUrl);
    url.searchParams.set('select', check.columns.join(','));
    url.searchParams.set('limit', '0');

    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `${check.relation} is not admin booking-ready for ${check.purpose}. HTTP ${response.status}: ${body}`,
      );
    }

    console.log(`${check.relation} verified for ${check.purpose}: ${check.columns.join(', ')}`);
  }
}

assertSourceContracts();

const fileEnv = loadEnvFile(path.join(process.cwd(), '.env.local'));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run from Baha-Buddy-Admin or export both env vars.',
  );
  process.exit(2);
}

try {
  await assertRemoteSchema({ supabaseUrl, serviceRoleKey });
  console.log('Admin booking readiness verified: canonical booking, trip item, financial, traveler, and support contracts are present.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
