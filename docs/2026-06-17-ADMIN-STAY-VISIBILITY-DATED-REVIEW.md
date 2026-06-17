# Admin Stay Visibility Dated Review - June 17, 2026

Review time: June 17, 2026, 10:24 EDT
Scope: Admin visibility for canonical mobile hotel/stay booking state

Related mobile status: [../../Baha-Buddy-V2/docs/STATUS_DONE_AND_LEFT.md](../../Baha-Buddy-V2/docs/STATUS_DONE_AND_LEFT.md)

## Executive Status

Admin now exposes the canonical hotel/stay identifiers needed to support the mobile booking return path.

The mobile app writes confirmed hotel stays to `trip_accommodations` with canonical place identity, LiteAPI provider identity, selected rate/prebook IDs, provider booking reference, total price/status, and `stripe_payment_intent_id`. Admin trip detail already showed most of those fields. This checkpoint adds the missing payment-intent link to Admin's typed accommodation row and renders it in the `/trips/[id]` accommodation identity grid.

The Admin bookings API also already normalizes canonical `bookings` into source surface, payment status, provider status, provider reference, and support failure state. Existing tests cover the required failure classes.

This does not close the full mobile-first booking parity plan. Mobile flight return parity remains open.

## What Changed

- Added `stripe_payment_intent_id` to `TripAccommodationRow`.
- Added `Payment intent` to the Admin trip detail accommodation identity grid.
- Extended `tests/api/trip-detail-accommodations.test.ts` to prove `/api/trip-detail` preserves the mobile stay payment-intent link alongside:
  - `place_id`
  - `liteapi_hotel_id`
  - `liteapi_rate_id`
  - `liteapi_prebook_id`
  - `booking_reference`
  - `total_price`
  - `currency`
  - `status`

## Files In Scope

- `src/lib/types.ts`
- `src/app/trips/[id]/page.tsx`
- `tests/api/trip-detail-accommodations.test.ts`
- `src/app/api/trip-detail/route.ts`
- `src/app/api/bookings/route.ts`
- `tests/api/bookings-status.test.ts`

## Verification

- Focused Admin tests passed:
  - `npm run test -- tests/api/trip-detail-accommodations.test.ts tests/api/bookings-status.test.ts`
- Full Admin test suite passed:
  - `npm run test`
  - 34 tests passed.
- Admin production build passed:
  - `npm run build`

Lint note: `npm run lint` is not currently a usable verification command because Next.js prompts interactively to create an ESLint config. No config was generated or modified during this checkpoint.

## Still Open

- Mobile flight booking return parity using the same standardized booking return shape as hotels.
- Canonical activities, deals, partners, and tour checkout should follow after hotel parity closes.

## Decision

Keep the broader plan open. Admin stay visibility is covered for the canonical hotel/stay path, but flight-return parity still needs implementation and verification.
