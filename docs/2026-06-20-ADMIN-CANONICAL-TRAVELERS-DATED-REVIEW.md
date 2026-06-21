# Admin Canonical Travelers Dated Review - June 20, 2026

Review time: June 20, 2026, 21:20 EDT
Scope: Admin Travelers list alignment with canonical booking health

## Executive Status

Admin Travelers now includes canonical booking health summaries on each traveler row.

This closes a plan gap where User Detail could inspect a single traveler's bookings and revenue, but the Travelers operations list did not show booking/payment/provider state. Operators can now see which travelers have bookings, captured payments, recognized revenue, provider pending/failed counts, source surfaces, and recovery issues from the list view.

This does not close the full booking parity plan. Live LiteAPI/Stripe hotel and flight checkout tests still need to prove real booking rows reconcile correctly in production.

## What Changed

- `/api/users` still reads `users` as the traveler source.
- `/api/users` now also loads canonical `bookings` for returned user IDs.
- Booking rows are enriched through `enrichBookingRows`, including trip accommodation and flight lookup by payment intent.
- Each returned traveler now includes `booking_summary` with:
  - total bookings
  - unique trip count
  - booking status counts
  - paid payment count
  - provider confirmed/pending/failed counts
  - recovery issue count
  - P0 recovery issue count
  - recognized revenue
  - captured payment amount
  - booking types
  - providers
  - source surfaces
- `TravelersModule` now shows booking count, trip count, recognized/captured amounts, provider health, issue count, source surface, and provider context in the traveler table.
- Traveler-level stats now include travelers with bookings, travelers with booking issues, captured payments, and recognized revenue.

## Files In Scope

- `src/app/api/users/route.ts`
- `src/components/admin-core-modules.tsx`
- `tests/api/users-canonical-bookings.test.ts`
- `tests/components/travelers-module-canonical-bookings.test.tsx`

## Verification

Focused Admin tests passed:

```bash
npm run test -- tests/api/users-canonical-bookings.test.ts tests/components/travelers-module-canonical-bookings.test.tsx
```

Adjacent canonical booking/admin tests passed:

```bash
npm run test -- tests/api/users-canonical-bookings.test.ts tests/components/travelers-module-canonical-bookings.test.tsx tests/api/trips-canonical-bookings.test.ts tests/components/trips-module-canonical-bookings.test.tsx tests/api/support-booking-issues.test.ts tests/components/support-module-booking-issues.test.tsx tests/api/payments-canonical.test.ts tests/api/billing-canonical-revenue.test.ts tests/api/bookings-status.test.ts tests/api/user-detail-revenue.test.ts tests/components/payments-module-canonical.test.tsx tests/components/billing-module-canonical.test.tsx tests/components/bookings-module-recovery.test.tsx
```

TypeScript check passed:

```bash
npx tsc --noEmit
```

## Still Open

- Run live hotel checkout and flight checkout through LiteAPI/Stripe.
- Confirm real booking rows reconcile across:
  - `bookings`
  - `trip_accommodations`
  - `trip_flights`
  - `travel_booking_records` as provider/audit logging only
- Confirm Travelers list summaries remain useful once real production booking rows exist.
- Add screenshots for Travelers, Trips, Trip Detail, Bookings, Payments, Billing, and Support after seeded/live booking rows are available.

## Decision

Keep the broader parity plan open. Admin Travelers now reflects canonical booking health, but real provider lifecycle validation remains required before booking parity can be marked complete.
