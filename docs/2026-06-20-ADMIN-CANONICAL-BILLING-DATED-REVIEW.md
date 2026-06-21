# Admin Canonical Billing Dated Review - June 20, 2026

Review time: June 20, 2026, 20:56 EDT
Scope: Admin Billing & APIs revenue source alignment

## Executive Status

Admin Billing & APIs now calculates revenue from reconciled canonical `bookings` instead of the legacy `stripe_revenue_summary` view.

This closes the remaining admin revenue-source inconsistency after Payments & Receipts was moved to canonical bookings. Billing still tracks AI/API/provider costs and credit status, but the revenue context shown beside those costs now uses the same booking reconciliation model as Bookings, Payments, Revenue, Stats, High-Intent, User Detail, and Trip Detail.

This does not prove the full booking lifecycle is complete. Live LiteAPI/Stripe hotel and flight checkout tests still need to create real rows and confirm webhook/provider reconciliation.

## What Changed

- `/api/billing` no longer queries `stripe_revenue_summary`.
- `/api/billing` reads monthly `bookings` rows and enriches them through `enrichBookingRows`.
- Billing now returns:
  - `revenueMonth` from reconciled bookings only
  - `grossBookingValueMonth`
  - `capturedPaymentsMonth`
  - `revenueSource: canonical_bookings`
  - booking status counts
  - payment status counts
  - provider status counts
  - reconciliation issue count
- `BillingModule` now displays canonical booking revenue context alongside AI/API costs.
- The module explains that legacy Stripe summary views are not used for revenue recognition.

## Files In Scope

- `src/app/api/billing/route.ts`
- `src/components/admin-core-modules.tsx`
- `tests/api/billing-canonical-revenue.test.ts`
- `tests/components/billing-module-canonical.test.tsx`

## Verification

Focused Admin tests passed:

```bash
npm run test -- tests/api/billing-canonical-revenue.test.ts tests/components/billing-module-canonical.test.tsx
```

Adjacent canonical booking/revenue tests passed:

```bash
npm run test -- tests/api/payments-canonical.test.ts tests/api/bookings-status.test.ts tests/api/revenue-summary.test.ts tests/api/stats-revenue.test.ts tests/components/payments-module-canonical.test.tsx tests/components/bookings-module-recovery.test.tsx
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
  - `travel_booking_records`
- Confirm web/mobile confirmation pages do not show confirmed until payment, provider, local booking, and trip item states reconcile.
- Capture stakeholder screenshots for Billing & APIs once real booking rows exist.

## Decision

Keep the broader parity plan open. Admin Billing & APIs is now aligned to canonical booking revenue, but real provider lifecycle validation remains required before booking parity can be marked complete.
