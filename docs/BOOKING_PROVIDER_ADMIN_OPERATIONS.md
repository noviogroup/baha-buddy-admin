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

## June 20, 2026 Payments Checkpoint

Admin Payments & Receipts now reads canonical `bookings` instead of `concierge_orders`.

The payments API enriches booking rows with `trip_accommodations` and `trip_flights`, then returns separate payment status, provider status, source surface, provider reference, failure state, reconciliation state, and trip item identity where available. The UI now presents those fields directly and keeps Concierge Orders as a separate operations module.

Current verification is documented in [`2026-06-20-ADMIN-CANONICAL-PAYMENTS-DATED-REVIEW.md`](./2026-06-20-ADMIN-CANONICAL-PAYMENTS-DATED-REVIEW.md).

## June 20, 2026 Billing Checkpoint

Admin Billing & APIs now calculates revenue from reconciled canonical `bookings` instead of the legacy `stripe_revenue_summary` view.

The billing API keeps AI/API cost and credit status reporting, but its booking revenue context now uses the same reconciliation model as Bookings, Payments, Revenue, Stats, User Detail, High-Intent, and Trip Detail.

Current verification is documented in [`2026-06-20-ADMIN-CANONICAL-BILLING-DATED-REVIEW.md`](./2026-06-20-ADMIN-CANONICAL-BILLING-DATED-REVIEW.md).

## June 20, 2026 Support Checkpoint

Admin Support now surfaces canonical booking recovery issues alongside support tickets.

The support API keeps `support_tickets` as the ticket source, but it now also reads canonical `bookings`, enriches rows with trip accommodations/flights, and returns a recovery queue for payment/provider/local booking mismatches. Support can now see source surface, payment status, provider status, provider reference, failure state, recovery priority, and next action without using provider/audit payload tables as the operational source of truth.

Current verification is documented in [`2026-06-20-ADMIN-CANONICAL-SUPPORT-DATED-REVIEW.md`](./2026-06-20-ADMIN-CANONICAL-SUPPORT-DATED-REVIEW.md).

## June 20, 2026 Trips Checkpoint

Admin Trips now includes canonical booking health summaries on the trip list.

The trips API keeps `trips` as the itinerary source, but it now also loads canonical `bookings` for returned trip IDs, enriches rows with trip accommodations/flights, and adds per-trip counts for payment status, provider status, recovery issues, source surfaces, captured payment value, and recognized revenue.

Current verification is documented in [`2026-06-20-ADMIN-CANONICAL-TRIPS-DATED-REVIEW.md`](./2026-06-20-ADMIN-CANONICAL-TRIPS-DATED-REVIEW.md).

## June 20, 2026 Travelers Checkpoint

Admin Travelers now includes canonical booking health summaries on the traveler list.

The users API keeps `users` as the traveler source, but it now also loads canonical `bookings` for returned user IDs, enriches rows with trip accommodations/flights, and adds per-traveler counts for payment status, provider status, recovery issues, source surfaces, captured payment value, recognized revenue, and unique trip count.

Current verification is documented in [`2026-06-20-ADMIN-CANONICAL-TRAVELERS-DATED-REVIEW.md`](./2026-06-20-ADMIN-CANONICAL-TRAVELERS-DATED-REVIEW.md).

## June 20, 2026 Revenue Checkpoint

Admin Revenue Command Center now uses canonical booking reconciliation for revenue recognition.

The revenue summary API reads canonical `bookings`, enriches rows with trip accommodations/flights, and reports captured payments separately from recognized revenue. Revenue now exposes payment status, provider status, source surface, recovery state, booking issue counts, and P0 recovery counts so finance and operations can separate money collected from revenue that is safe to recognize.

Current verification is documented in [`2026-06-20-ADMIN-CANONICAL-REVENUE-DATED-REVIEW.md`](./2026-06-20-ADMIN-CANONICAL-REVENUE-DATED-REVIEW.md).
