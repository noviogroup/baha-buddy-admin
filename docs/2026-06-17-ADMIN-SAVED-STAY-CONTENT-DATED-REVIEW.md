# Admin Saved Stay Content Dated Review

Date: June 17, 2026  
Time: 13:22:09 EDT  
Updated: 13:54:07 EDT  
Scope: Admin trip detail visibility for canonical hotel/stay content saved from mobile

## Summary

Admin trip detail now displays the same canonical stay content that mobile saves into `trip_accommodations`: address, property type, description, gallery imagery, amenities, rating/stars, canonical `place_id`, LiteAPI IDs, booking reference, payment intent, total, and status.

This closes the support visibility gap where mobile could preserve curated hotel content through `CanonicalStay`, but Admin only showed booking identity and price fields.

## Code Changes

- Added saved-stay content fields to `TripAccommodationRow`:
  - `address`
  - `description`
  - `property_type`
  - `gallery_images`
  - `amenities`
- Updated `/trips/[id]` accommodations rendering to show:
  - lead image from `photo_url` or first gallery image
  - property type chip
  - rating and star rating
  - address with map marker
  - short description
  - amenity chips
  - gallery image count
  - existing canonical/provider/payment identity grid
- Updated `trip-detail-accommodations.test.ts` fixture and expectations so the API contract explicitly preserves the new content fields.
- Added `npm run verify:stay-schema`, a read-only Supabase REST preflight that verifies the live `trip_accommodations` table exposes `address`, `description`, `property_type`, `gallery_images`, and `amenities`.

## Verification

- `npm run test -- tests/api/trip-detail-accommodations.test.ts` passed with 2 tests.
- `npm run build` passed and type-checked `/trips/[id]`.
- `npm run verify:stay-schema` reached the live Supabase project and failed as expected because the migration is not applied yet:
  - HTTP 400
  - Postgres code `42703`
  - message: `column trip_accommodations.address does not exist`

## Verification Limits

- `npm run lint -- --file src/app/trips/[id]/page.tsx --file src/lib/types.ts` could not run because this Admin app does not have ESLint configured; `next lint` opened the interactive configuration prompt instead of linting.
- Admin code/build behavior is ready, but live Supabase data is not. The production project still needs the mobile migration applied before real rows can contain the new columns.

## Still Open

- Apply `20260617121000_trip_accommodations_canonical_stay_content.sql` to Supabase project `cxcfymhoncysyloutvkh`.
- Current shell cannot apply it through `supabase migration list --linked` / CLI because the Supabase CLI has no access token: `Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.`
- After authenticating the CLI, apply with:
  - `cd "/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/Baha-Buddy-V2"`
  - `supabase db push`
- Then rerun:
  - `cd "/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/Baha-Buddy-Admin"`
  - `npm run verify:stay-schema`
- Perform a live Add to Trip and hotel checkout smoke test after migration to confirm Admin receives the new fields from real mobile writes.
