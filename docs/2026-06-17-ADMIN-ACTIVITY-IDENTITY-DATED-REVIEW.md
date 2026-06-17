# Admin Activity Identity Dated Review

Date: June 17, 2026  
Time: 11:24:36 EDT  
Scope: Admin trip detail activity visibility after mobile canonical activity identity persistence

## Summary

Admin trip detail now reads and displays canonical activity identity from `trip_activities` instead of relying on fields that mobile does not write.

Before this pass, the itinerary row label used `title || activity_id || 'Activity'`, while mobile writes `activity_name`. That meant Admin could show generic activity labels even when the traveler saved a real restaurant, activity, or tour.

## Changes

- `TripActivityRow` now includes source/provider/media/price metadata fields:
  - `source_type`
  - `source_id`
  - `provider`
  - `provider_activity_id`
  - `image_url`
  - `price`
  - `currency`
  - `metadata`
- `/trips/[id]` now renders `activity_name` first.
- Itinerary rows display activity type, source type, source ID, and provider chips when available.
- Admin trip-detail API test now verifies canonical activity fields survive the API response.

## Verification

- `npm run test -- tests/api/trip-detail-accommodations.test.ts` passed with 2 tests.
- `npm run test` passed with 35 tests.
- `npm run build` passed.

## Still Open

- Admin can see canonical activity identity, but full operational activity booking status still depends on the later activity booking/reconciliation work.
- Deals, partners, and native tour checkout need the same canonical operational model.
