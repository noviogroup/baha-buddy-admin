# Admin Canonical Revenue Dated Review - June 20, 2026

Review time: June 20, 2026, 21:29 EDT
Scope: Admin Revenue Command Center canonical booking reconciliation

## Executive Status

Admin Revenue Command Center now reports revenue from canonical `bookings` using the shared booking reconciliation model.

Revenue is recognized only when the booking row, payment state, provider state, and trip item state reconcile. Captured payments remain visible separately so operations can see money collected before revenue is safe to recognize.

This does not prove the full booking lifecycle is complete. Live LiteAPI/Stripe hotel and flight checkout tests still need to create real rows and confirm webhook/provider reconciliation.

## What Changed

- `/api/revenue/summary` now enriches `bookings` through `enrichBookingRows`.
- Recognized revenue now uses `isRecognizedRevenue` instead of raw booking status or `paid_at` alone.
- Revenue summary now returns:
  - captured payments
  - payment status counts
  - provider status counts
  - booking issue counts
  - P0 recovery issue counts
  - `revenueSource: canonical_bookings`
- Revenue breakdowns now include:
  - category
  - provider
  - payment status
  - provider status
  - source surface
  - recovery state
- Breakdown rows now show gross, captured, recognized, and issue counts.
- `RevenueModule` now exposes captured payments, provider status, booking issues, revenue source, and recovery-state breakdowns.

## Files In Scope

- `src/app/api/revenue/summary/route.ts`
- `src/components/revenue-module.tsx`
- `tests/api/revenue-summary.test.ts`
- `tests/components/revenue-module-canonical-bookings.test.tsx`

## Verification

Focused Admin tests passed:

```bash
npm run test -- tests/api/revenue-summary.test.ts tests/components/revenue-module-canonical-bookings.test.tsx
```

Adjacent canonical booking tests passed:

```bash
npm run test -- tests/api/revenue-summary.test.ts tests/components/revenue-module-canonical-bookings.test.tsx tests/api/payments-canonical.test.ts tests/api/billing-canonical-revenue.test.ts tests/api/bookings-status.test.ts tests/api/stats-revenue.test.ts tests/components/payments-module-canonical.test.tsx tests/components/billing-module-canonical.test.tsx tests/components/bookings-module-recovery.test.tsx
```

TypeScript check passed:

```bash
npx tsc --noEmit
```

Full Admin test suite passed:

```bash
npm test
```

Production build passed:

```bash
npm run build
```

Admin sync passed:

```bash
npm run sync
```

## Still Open

- Run live hotel checkout and flight checkout through LiteAPI/Stripe.
- Confirm real booking rows reconcile across:
  - `bookings`
  - `trip_accommodations`
  - `trip_flights`
  - `travel_booking_records`
- Confirm provider-pending, provider-failed, refunded, abandoned checkout, and local-save-failed states appear correctly in Revenue, Payments, Billing, Support, Trips, and Travelers.
- Capture stakeholder screenshots for the Revenue Command Center once real booking rows exist.

## Decision

Keep the broader parity plan open. Admin Revenue now uses canonical booking reconciliation, but real provider lifecycle validation remains required before booking parity can be marked complete.
