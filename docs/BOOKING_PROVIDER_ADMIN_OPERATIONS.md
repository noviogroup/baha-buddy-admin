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
