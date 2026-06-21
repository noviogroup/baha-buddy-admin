# Admin Communications Command Center Review - June 21, 2026

Review time: June 21, 2026, 04:18 EDT
Scope: Admin Communications module, communication event API, safe resend path, and launch-readiness visibility

## Executive Status

Admin now has an operational Communications module for the transactional communications foundation added to mobile/Supabase.

The command center can list `communication_events`, join delivery attempts from `communication_deliveries`, show traveler context, summarize sent/failed/skipped states, and trigger audited safe email resends through the Supabase `send-communication` Edge Function.

This is source-ready, locally validated, and the linked Supabase project now has the transactional communications schema applied. `send-communication`, `send-trip-invite`, `accept-invite`, and `stripe-webhook` are deployed with `INTERNAL_API_SECRET` available as a Supabase secret.

## What Changed

- Added `Communications` to the Admin command center navigation.
- Added `CommunicationsModule` to show communication events, traveler identity, delivery attempts, routes, timestamps, and resend actions.
- Added `GET /api/communications` for filtered event review and summary counts.
- Added `POST /api/communications` for safe email resend.
- Added `communication_event` to admin audit entity types.
- Added `INTERNAL_API_SECRET` to `.env.example`.
- Updated admin database types for `communication_events` and `communication_deliveries`, including the communication event `channels` audit field.
- Added focused API tests for listing, resend eligibility, internal Edge Function call shape, and audit metadata.

## Launch-Safety Rules

- Admin resend is only allowed for safe transactional event types.
- Admin resend only targets failed or skipped email deliveries.
- Resend uses `x-internal-secret` and the server-side service role key.
- Resend writes an `email_resent` admin audit log entry.
- The UI shows a migration-missing note if `communication_events` does not exist yet.

## Validation

Passed locally:

- `npm run test -- tests/api/communications.test.ts`
- `npm run test` with 24 files and 65 tests
- `npm run build`
- V2 `npm run verify:communications-remote` against the linked Supabase project

Not runnable as a configured check:

- `npm run lint`

Reason: the admin package does not currently have an ESLint config, so `next lint` opens the interactive setup prompt and exits instead of running lint.

## Required Live Validation

Before launch approval:

1. Configure `INTERNAL_API_SECRET` in the deployed Admin hosting environment.
2. Verify `/api/communications` loads real events from production.
3. Trigger a failed/skipped email delivery and use Admin to resend it.
4. Confirm the resend creates:
   - a new `communication_events` row
   - a new `communication_deliveries` email row
   - an `admin_audit_log` row with `email_resent`
5. Complete Firebase credential setup before validating push deliveries.

## Launch Decision

This closes the admin visibility gap for transactional communications at the source-code level. Live provider validation is still required before claiming communications are production-ready.
