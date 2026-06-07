#!/usr/bin/env node

import crypto from 'node:crypto';

const endpoint = process.env.CONCIERGE_WEBHOOK_TEST_URL || 'http://localhost:3001/api/stripe/concierge-webhook';
const webhookSecret = process.env.STRIPE_CONCIERGE_WEBHOOK_SECRET;

if (!webhookSecret) {
  console.error('Missing STRIPE_CONCIERGE_WEBHOOK_SECRET. Add it to your shell or .env.local before running this test.');
  process.exit(1);
}

const offerId = process.env.TEST_OFFER_ID || 'concierge_trip_plan';
const source = process.env.TEST_SOURCE || 'local_webhook_test';
const email = process.env.TEST_TRAVELER_EMAIL || 'local-test@bahabuddy.app';
const name = process.env.TEST_TRAVELER_NAME || 'Local Webhook Test';

const priceMap = {
  quick_review: 49,
  concierge_trip_plan: 149,
  full_planning_support: 299,
};

const amountTotal = (priceMap[offerId] || 149) * 100;
const timestamp = Math.floor(Date.now() / 1000);
const nonce = Date.now().toString(36);

const event = {
  id: `evt_local_concierge_${nonce}`,
  object: 'event',
  api_version: '2024-06-20',
  created: timestamp,
  type: 'checkout.session.completed',
  livemode: false,
  data: {
    object: {
      id: `cs_test_local_${nonce}`,
      object: 'checkout.session',
      amount_total: amountTotal,
      currency: 'usd',
      customer_email: email,
      customer_details: {
        email,
        name,
      },
      payment_intent: `pi_test_local_${nonce}`,
      payment_status: 'paid',
      metadata: {
        product: 'concierge_trip_plan',
        offer_id: offerId,
        source,
        local_test: 'true',
      },
    },
  },
};

const rawBody = JSON.stringify(event);
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${timestamp}.${rawBody}`)
  .digest('hex');

const stripeSignature = `t=${timestamp},v1=${signature}`;

console.log(`Sending local Stripe-style webhook to ${endpoint}`);
console.log(`Event: ${event.id}`);
console.log(`Offer: ${offerId}`);
console.log(`Customer: ${name} <${email}>`);

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'stripe-signature': stripeSignature,
  },
  body: rawBody,
});

const responseText = await response.text();

console.log(`Status: ${response.status}`);
console.log(responseText);

if (!response.ok) {
  process.exit(1);
}
