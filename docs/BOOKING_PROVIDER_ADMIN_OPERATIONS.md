# Booking Provider Admin Operations

Baha Buddy now has a live travel booking provider connection.

The admin portal should operate as the control center for reservation visibility, support, Concierge linkage, and source attribution.

## Admin Scope

Admin should show:

- Reservation status
- Traveler details
- Trip dates and destination
- Source channel
- Linked Concierge order
- Support notes
- Provider reference where available
- Revenue/source attribution where available

## Rollout

1. Add shared booking records in Supabase.
2. Add booking queue visibility in admin.
3. Filter by status, source, product type, and date.
4. Add booking detail view.
5. Link bookings to Concierge orders.
6. Add status sync and support messaging.
7. Add revenue and source reporting.

## Operational Rule

Admin should read normalized Baha Buddy booking records first. Direct provider actions should happen only through server-side routes.

## June 17, 2026 Hotel/Stay Checkpoint

Admin trip detail now exposes the mobile hotel/stay reconciliation fields from `trip_accommodations`, including canonical `place_id`, LiteAPI hotel/rate/prebook IDs, provider booking reference, status, total price, and `stripe_payment_intent_id`.

The bookings API normalizes canonical `bookings` into source surface, payment status, provider status, provider reference, and support failure state. Current verification is documented in [`2026-06-17-ADMIN-STAY-VISIBILITY-DATED-REVIEW.md`](./2026-06-17-ADMIN-STAY-VISIBILITY-DATED-REVIEW.md).
