# Concierge Admin Payment Flow

The web app can now take immediate Stripe payment for concierge trip planning offers. The admin portal turns each successful Stripe Checkout into an operational `concierge_orders` record that the team can fulfill.

## Live web offers

| Offer | Price | Offer ID |
| --- | ---: | --- |
| Quick Review | $49 | `quick_review` |
| Concierge Trip Plan | $149 | `concierge_trip_plan` |
| Full Planning Support | $299 | `full_planning_support` |

## Web flow

```txt
/concierge-trip-plan
→ POST /api/concierge-checkout
→ Stripe Checkout
→ /concierge-trip-plan/success?session_id={CHECKOUT_SESSION_ID}&offer={offer_id}
→ paid trip details form
```

## Stripe metadata expected from web checkout

```txt
metadata.product = concierge_trip_plan
metadata.offer_id = quick_review | concierge_trip_plan | full_planning_support
metadata.source = concierge_page or CTA source
```

The admin portal uses `offer_id` and `source` for filtering and reporting.

## Admin endpoint

Configure Stripe to send webhooks to the deployed admin URL:

```txt
POST https://YOUR-ADMIN-DOMAIN.com/api/stripe/concierge-webhook
```

Required Stripe events:

```txt
checkout.session.completed
payment_intent.payment_failed
charge.refunded
```

## Required environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://cxcfymhoncysyloutvkh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAILS=admin@example.com
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com
STRIPE_CONCIERGE_WEBHOOK_SECRET=whsec_...
```

`SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_CONCIERGE_WEBHOOK_SECRET` must remain server-side only.

## Real Stripe validation path

Use Stripe test mode so the webhook receives real Stripe events and the admin queue reflects the actual payment flow.

1. Deploy the admin portal with `STRIPE_CONCIERGE_WEBHOOK_SECRET` set.
2. In Stripe, add the deployed admin webhook URL.
3. Enable `checkout.session.completed`, `payment_intent.payment_failed`, and `charge.refunded`.
4. Complete a test purchase from `/concierge-trip-plan` in the web app.
5. Confirm Stripe shows the event delivered successfully.
6. Confirm a row appears in `concierge_orders`.
7. Confirm the order appears in `Command Center → Operations → Concierge Orders`.

## Database objects

The admin flow uses:

- `concierge_orders`
- `stripe_webhook_events`
- `v_concierge_order_metrics`

Supplemental admin fields on `concierge_orders`:

- `assigned_team_member`
- `internal_notes`
- `final_itinerary`
- `stripe_metadata`
- `delivered_at`
- `refunded_at`
- `fulfillment_started_at`

## Order creation behavior

When Stripe sends `checkout.session.completed`, the webhook creates a `concierge_orders` row if one does not already exist for the Stripe Checkout Session ID.

Example order payload:

```json
{
  "offer_type": "concierge_trip_plan",
  "price_usd": 149,
  "status": "paid",
  "payment_status": "paid",
  "stripe_checkout_session_id": "cs_test_...",
  "stripe_payment_intent_id": "pi_...",
  "source": "concierge_page",
  "traveler_email": "customer@example.com",
  "traveler_name": "Customer Name",
  "notes": "Stripe Checkout completed for concierge_trip_plan.",
  "stripe_metadata": {
    "product": "concierge_trip_plan",
    "offer_id": "concierge_trip_plan",
    "source": "concierge_page"
  }
}
```

## Admin queue location

Open:

```txt
Command Center → Operations → Concierge Orders
```

The queue supports:

- Filtering by order status
- Filtering by payment status
- Filtering by offer type
- Filtering by source
- Order detail view
- Assignment
- Internal notes
- Final itinerary text
- Delivered plan URL
- Mark delivered
- Stripe session/payment intent reconciliation

## Statuses

Operational status values:

```txt
paid
in_review
needs_info
in_progress
delivered
cancelled
refunded
payment_failed
```

Payment status values:

```txt
paid
unpaid
failed
refunded
```

## Manual validation checklist

1. Set `STRIPE_CONCIERGE_WEBHOOK_SECRET` in the admin deployment.
2. Add the admin webhook URL in Stripe.
3. Enable `checkout.session.completed`, `payment_intent.payment_failed`, and `charge.refunded`.
4. Complete a test checkout from `/concierge-trip-plan`.
5. Confirm a row appears in `concierge_orders`.
6. Confirm the row appears in `Command Center → Operations → Concierge Orders`.
7. Open order detail.
8. Assign the order to a team member.
9. Change status to `in_review`, then `in_progress`.
10. Add internal notes and a final itinerary/delivered plan URL.
11. Mark as delivered.
12. Confirm the metrics update.

## Key operational message

The web app can now take payment. The admin portal turns each Stripe payment into a Concierge Order that the team can fulfill, track, deliver, and reconcile.
