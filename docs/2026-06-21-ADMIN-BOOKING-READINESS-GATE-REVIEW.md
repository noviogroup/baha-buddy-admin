# Admin Booking Readiness Gate Review - June 21, 2026

Review time: June 21, 2026, 18:12 EDT
Surface: Baha Buddy Admin
Shared backend: Supabase project `cxcfymhoncysyloutvkh`

## Summary

Admin now has a non-destructive booking-readiness gate that verifies the operational booking source model across code and the live Supabase schema.

The gate enforces the intended source-of-truth contract:

- `bookings` is the canonical traveler/admin booking source.
- `trip_accommodations`, `trip_flights`, and `trip_activities` are the canonical trip item tables.
- `v_booking_financials` supports admin financial reporting.
- `travel_booking_records` remains audit/provider evidence only and is not used by admin API routes as the operational source.
- Admin surfaces can reconcile source surface, payment status, provider status, provider reference, failure state, and related trip item identity.

## Code Changes

- Added `npm run verify:booking-readiness`.
- Added `scripts/verify-booking-readiness-admin.mjs`.
- Fixed admin trip detail flight ordering from `departure` to canonical `departure_at`.
- Added test coverage that trip detail orders flights by `departure_at`.
- Updated `TripFlightRow` to include `stripe_payment_intent_id`.
- Added `.eslintrc.json` and installed compatible Next 14 lint dependencies so `npm run lint` is a real launch gate.
- Fixed lint-blocking React issues in admin table cells and day-stop autofill.

## Supabase Migrations Applied

The following idempotent migrations were added to the admin repo and applied to the live Supabase project:

- `20260621174000_admin_booking_readiness_columns.sql`
  - Adds booking provider/audit compatibility fields including `type`, `supplier_ref`, `booking_ref`, `amount_cents`, `commission_cents`, and `raw_response`.
  - Adds `trip_flights.stripe_payment_intent_id`.
  - Adds canonical activity metadata fields.
  - Adds canonical stay content fields used by admin and booking reconciliation.
- `20260621175500_admin_booking_reference_parity.sql`
  - Adds `bookings.booking_reference`.
  - Backfills from `booking_ref` or `supplier_ref` when available.
- `20260621180500_admin_trip_accommodations_payment_intent.sql`
  - Adds `trip_accommodations.stripe_payment_intent_id`.

The verifier initially failed on missing live columns, then passed after the migrations were applied.

## Verification

Passed:

- `npm run verify:booking-readiness`
- `npm run verify:stay-schema`
- `npm run verify:communications`
- `npm run test -- tests/api/bookings-status.test.ts tests/api/support-booking-issues.test.ts tests/api/revenue-summary.test.ts tests/api/payments-canonical.test.ts tests/api/trips-canonical-bookings.test.ts tests/api/users-canonical-bookings.test.ts tests/api/trip-detail-accommodations.test.ts tests/api/stats-revenue.test.ts tests/api/billing-canonical-revenue.test.ts tests/api/user-detail-revenue.test.ts tests/api/high-intent-reconciliation.test.ts`
- `npm run test`
- `npm run lint`
- `npm run build`

`npm run lint` exits successfully. It still reports warnings for existing hook dependency/image/alt-text cleanup items, but no lint errors remain.

## Current Status

Admin booking readiness is now verified at the schema and source-contract level.

This does not prove a real charged booking lifecycle by itself. Final launch approval still needs controlled live LiteAPI/Stripe hotel and flight lifecycle QA proving payment, provider booking, local canonical booking row, trip item state, and admin modules reconcile for success, pending, failed, cancelled, refunded, and abandoned checkout states.
