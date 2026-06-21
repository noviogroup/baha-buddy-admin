# Admin Canonical Support Dated Review - June 20, 2026

Review time: June 20, 2026, 21:07 EDT
Scope: Admin Support alignment with canonical booking recovery state

## Executive Status

Admin Support now surfaces canonical booking recovery issues alongside traveler support tickets.

This closes a plan gap where Bookings, Payments, Billing, Revenue, Stats, User Detail, High-Intent, and Trip Detail already used canonical booking reconciliation, but Support could only see support-ticket rows. Support now sees payment/provider/local booking mismatches from canonical `bookings` enriched with `trip_accommodations` and `trip_flights`.

This does not close the full mobile-first booking parity plan. Live LiteAPI/Stripe hotel and flight checkout tests still need to prove real booking rows reconcile correctly in production.

## What Changed

- `/api/support` still returns support tickets from `support_tickets`.
- `/api/support` now also reads recent canonical `bookings`.
- Booking rows are enriched through `enrichBookingRows`, including trip accommodation and trip flight lookup by payment intent.
- The API now returns:
  - `bookingIssues`
  - canonical booking summary counts
  - payment status
  - provider status
  - source surface
  - provider reference
  - failure state
  - recovery label, priority, summary, checklist, and next action
- Support UI now shows a `Provider and payment issues` recovery queue before the ticket table.
- Support stats now include:
  - ticket counts
  - canonical bookings reviewed
  - booking issues
  - P0 booking issues
  - payment captured/provider failed count
- Cancelled and refunded bookings remain counted in API summary, but the visible Support queue focuses on P0/P1/abandoned checkout states that need operational action.

## Files In Scope

- `src/app/api/support/route.ts`
- `src/components/admin-core-modules.tsx`
- `tests/api/support-booking-issues.test.ts`
- `tests/components/support-module-booking-issues.test.tsx`

## Verification

Focused Admin tests passed:

```bash
npm run test -- tests/api/support-booking-issues.test.ts tests/components/support-module-booking-issues.test.tsx
```

Adjacent canonical booking/admin tests passed:

```bash
npm run test -- tests/api/support-booking-issues.test.ts tests/components/support-module-booking-issues.test.tsx tests/api/payments-canonical.test.ts tests/api/billing-canonical-revenue.test.ts tests/api/bookings-status.test.ts tests/components/payments-module-canonical.test.tsx tests/components/billing-module-canonical.test.tsx tests/components/bookings-module-recovery.test.tsx
```

TypeScript check passed:

```bash
npx tsc --noEmit
```

Full Admin test suite passed:

```bash
npm test
```

Result: 18 test files passed, 58 tests passed.

Admin production build passed:

```bash
npm run build
```

Lint note: `npm run lint` is still not a usable non-interactive verification command because this Next.js app prompts to create an ESLint config. The production build reports linting skipped.

## Still Open

- Run live hotel checkout and flight checkout through LiteAPI/Stripe.
- Confirm real booking rows reconcile across:
  - `bookings`
  - `trip_accommodations`
  - `trip_flights`
  - `travel_booking_records` as provider/audit logging only
- Confirm Support recovery queue displays useful traveler context once real production booking rows exist.
- Add screenshots for Support, Bookings, Payments, Billing, Trip Detail, and User Detail after seeded/live booking rows are available.

## Decision

Keep the broader parity plan open. Admin Support now uses canonical booking recovery state, but real provider lifecycle validation remains required before booking parity can be marked complete.
