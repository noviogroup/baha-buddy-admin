# Admin Canonical Payments Dated Review - June 20, 2026

Review time: June 20, 2026, 20:44 EDT
Scope: Admin Payments & Receipts parity with canonical booking records

## Executive Status

Admin Payments & Receipts now uses canonical `bookings` as its operating source of truth instead of `concierge_orders`.

This closes a plan gap where Bookings, Revenue, Stats, High-Intent, User Detail, and Trip Detail already used canonical booking reconciliation, but the Payments & Receipts workspace still showed Concierge-order payment rows. Concierge Orders remains a separate operations module. Payments & Receipts now tracks traveler-facing booking payments across flights, stays, activities, and concierge through the shared booking status model.

This does not close the full mobile-first booking parity plan. Live provider/webhook validation still has to prove real hotel and flight checkouts populate `bookings`, `trip_accommodations`, and `trip_flights` correctly in production.

## What Changed

- `/api/payments` now reads from `bookings`.
- `/api/payments` enriches rows with `trip_accommodations` and `trip_flights` through `enrichBookingRows`.
- The API response now exposes:
  - `payment_status`
  - `provider_status`
  - `source_surface`
  - `provider_reference`
  - `failure_state`
  - `reconciled`
  - linked trip item identity where available
- Existing `offer_type` query support remains as a backward-compatible alias for `booking_type`.
- Payments summaries now distinguish:
  - recognized revenue
  - captured payments
  - refunded value
  - provider confirmed/pending/failed counts
  - reconciliation issue count
- Payments UI copy now describes canonical booking reconciliation, not Concierge-only payments.
- Payments table and detail panel now show payment status and provider status separately.
- Filter controls now have accessible names:
  - Payment status
  - Booking type
  - Provider status
  - Source surface

## Files In Scope

- `src/app/api/payments/route.ts`
- `src/components/payments-module.tsx`
- `tests/api/payments-canonical.test.ts`
- `tests/components/payments-module-canonical.test.tsx`

## Verification

Focused Admin tests passed:

```bash
npm run test -- tests/api/payments-canonical.test.ts tests/components/payments-module-canonical.test.tsx
```

Adjacent canonical booking/revenue tests passed:

```bash
npm run test -- tests/api/bookings-status.test.ts tests/api/revenue-summary.test.ts tests/api/stats-revenue.test.ts tests/components/bookings-module-recovery.test.tsx
```

Full Admin test suite passed:

```bash
npm test
```

Result: 14 test files passed, 54 tests passed.

TypeScript check passed:

```bash
npx tsc --noEmit
```

Admin production build passed:

```bash
npm run build
```

Lint note: `npm run lint` is still not a usable non-interactive verification command because this Next.js app prompts to create an ESLint config. No ESLint config was generated or modified during this checkpoint.

## Still Open

- Run live hotel checkout and flight checkout tests against LiteAPI/Stripe and confirm rows reconcile across:
  - `bookings`
  - `trip_accommodations`
  - `trip_flights`
  - `travel_booking_records` as provider/audit logging only
- Confirm web and mobile booking confirmations use the same no-false-confirmed rule.
- Add end-to-end screenshots for Booking Operations, Payments & Receipts, Revenue, Trip Detail, and User Detail once seeded/live booking rows exist.

## Decision

Keep the broader parity plan open. Admin Payments & Receipts is now aligned to the canonical booking status model, but real provider lifecycle validation remains required before the full booking parity plan can be marked complete.
