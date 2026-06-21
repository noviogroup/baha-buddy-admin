# Baha Buddy Admin Command Center Modules

## Purpose

This document defines the strategic modules the Baha Buddy admin panel needs in order to evolve from an operational dashboard into the command center for revenue, partners, users, booking operations, and tourism intelligence.

The admin should not only show records. It should help the team make decisions, identify revenue opportunities, manage partners, and act on high-intent travelers.

---

## Current admin state

The current admin dashboard already includes:

- Overview
- Users
- Trips
- Chat & AI
- Bookings
- Billing & APIs
- Audit Log
- Support
- Content

The codebase also expects admin database tables:

- `admin_users`
- `admin_audit_log`
- `admin_notes`
- `pii_access_log`

A migration has been added at:

- `migrations/20260607_admin_core_tables.sql`

This migration should be applied before relying on admin auth, admin role management, audit logging, or PII access logging.

---

## Target admin module structure

Recommended primary navigation:

1. Overview
2. Launch Readiness
3. Revenue
4. Bookings
5. Travelers
6. Trips
7. High-Intent Queue
8. Places
9. Partners
10. Destination Intelligence
11. Content Performance
12. Chat & AI
13. Billing & APIs
14. Support
15. Admin & Audit

This can be grouped in the sidebar as:

### Command Center

- Overview
- Launch Readiness
- Revenue
- Destination Intelligence
- High-Intent Queue

### Operations

- Bookings
- Travelers
- Trips
- Support

### Marketplace

- Places
- Partners
- Content Performance

### Systems

- Chat & AI
- Billing & APIs
- Admin & Audit

---

# Module 1: Overview

## Purpose

A daily executive snapshot for the Baha Buddy team.

## Required widgets

- Revenue today
- Revenue this month
- AI/API cost this month
- Net margin estimate
- New users today
- Trips created today
- Active trips
- Bookings pending
- High-intent travelers
- Top requested islands
- System health alerts

## Data sources

- `users`
- `trips`
- `bookings`
- `ai_usage_log`
- `api_credit_status`
- future `traveler_events`
- future canonical `places`

---

# Module 2: Launch Readiness

## Purpose

Cross-functional task manager for beta and launch readiness. It turns the scenario coverage plan into assigned, reviewable, auditable gates that the team can manage from the admin panel.

## Required capabilities

- Seed launch gates from the scenario coverage plan
- Track priority, workstream, owner, status, due date, evidence, notes, and source/scenario reference
- Move items through `todo`, `in_progress`, `needs_approval`, `approved`, `blocked`, and `done`
- Capture approver email and timestamp when an item is approved
- Show launch gate status, open P0 count, blocked count, and completion rate
- Audit create, update, status change, and approval actions

## Data sources

- `launch_readiness_tasks`
- `admin_users`
- `admin_audit_log`
- Scenario coverage source: `../docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md`

## Current implementation

- Migration: `supabase/migrations/20260619130000_launch_readiness_tasks.sql`
- API: `src/app/api/launch-readiness/route.ts`
- UI: `src/components/launch-readiness-module.tsx`

---

# Module 3: Revenue

## Purpose

Track money flowing through the ecosystem.

## Required metrics

- Monthly revenue
- Revenue today
- Revenue by category
- Gross booking value
- Net revenue
- Stripe revenue
- Concierge revenue
- Partner subscription revenue
- Sponsored campaign revenue
- Visa referral/service revenue

## Recommended revenue categories

- Flight booking
- Hotel booking
- Activity booking
- Restaurant/reservation
- Airport transfer
- Concierge trip plan
- Cruise day plan
- Self-guided tour
- Partner subscription
- Sponsored placement
- Visa/travel document service

## Required future data model

Consider a normalized `revenue_events` table later.

Fields:

- `id`
- `user_id`
- `trip_id`
- `booking_id`
- `partner_id`
- `category`
- `source`
- `gross_amount`
- `net_amount`
- `currency`
- `provider`
- `status`
- `occurred_at`

---

# Module 3: Bookings

## Purpose

Manage all booking/order activity across flights, hotels, activities, restaurants, transfers, concierge, and future tours.

## Required metrics

- Total bookings
- Confirmed bookings
- Pending bookings
- Failed bookings
- Cancelled/refunded bookings
- Abandoned checkout rate
- Booking revenue by category
- Booking conversion from chat
- Booking conversion from Explore

## Required actions

- View booking detail
- Cancel booking
- Refund booking
- Resend confirmation email
- Add internal note
- Link booking to trip/user/partner
- Mark manual booking status

## Current data sources

- `bookings`
- `trip_flights`
- `trip_accommodations`
- `trip_activities`
- Duffel order functions
- Hotel order functions
- Stripe webhooks

---

# Module 4: Travelers

## Purpose

Understand and support individual users.

## Required metrics

- New users
- Active users
- Completed profiles
- Returning users
- Trips per user
- Revenue per user
- Chat messages per user
- Visa-service interest
- Origin city/country

## Required actions

- View profile
- View trips
- View chats
- View bookings
- Add admin note
- Mark high intent
- Export user data where appropriate
- Reveal PII only with reason and audit log

## Current data sources

- `users`
- `trips`
- `chat_threads`
- `chat_messages`
- `bookings`
- `admin_notes`
- `pii_access_log`

---

# Module 5: Trips

## Purpose

Manage planned, active, shared, and abandoned trips.

## Required metrics

- Trips created
- Saved trips
- Active trips
- Abandoned trip plans
- Trip-to-payment conversion
- Average budget estimate
- Most planned islands
- Trips by status
- Trips by party type

## Required actions

- View trip detail
- View itinerary items
- View linked chat
- View collaborators
- Add internal note
- Flag for concierge follow-up
- Mark status

## Foundation dependency

`public.trips` RLS must be enabled after tests pass.

---

# Module 6: High-Intent Queue

## Purpose

Surface travelers likely to convert so the team can manually follow up or offer concierge services.

## Signals

- Created a trip
- Asked about booking
- Asked about hotels/flights
- Asked about visa/documents
- Returned multiple times
- Has a budget estimate
- Clicked checkout
- Abandoned checkout
- Asked for group/family/honeymoon/luxury planning
- Viewed multiple hotels/restaurants/activities
- Shared or invited someone to a trip

## Required fields

- User
- Trip
- Intent score
- Last activity
- Intent signals
- Suggested next action
- Assigned owner
- Status: new, contacted, converted, not ready, closed

## Required future data model

Consider `traveler_intent_events` and `high_intent_leads`.

---

# Module 7: Places

## Purpose

Manage the canonical place inventory across Google Places, TripAdvisor, partner data, and manual curation.

## Required fields

- Place name
- Category
- Island
- Source links
- Rating/reviews
- Photos
- Active/hidden status
- Verified status
- Partner flag
- Description override
- Primary image

## Required actions

- View place
- Edit display metadata
- Hide/show place
- Mark verified
- Mark as partner
- Review duplicate candidates
- Merge duplicates
- View source records

## Foundation dependency

Canonical `places` and `place_sources` tables are required before this module becomes strategic.

---

# Module 8: Partners

## Purpose

Manage the supply-side business ecosystem.

## Partner categories

- Hotels
- Restaurants
- Tour operators
- Transportation providers
- Boat charters
- Airport transfers
- Local guides
- Cruise-friendly vendors
- Attractions
- Visa/travel services
- Destination stakeholders

## Required metrics

- Active partners
- Partner tier
- Partner leads
- Partner bookings
- Partner revenue
- Sponsored placement performance
- Deal performance
- Partner conversion rate

## Required actions

- Create partner
- Link partner to places
- Set tier
- Set commission model
- Track leads
- Track bookings
- Add internal relationship notes
- Upload/approve assets
- Mark featured/sponsored

## Required future data model

- `partners`
- `partner_places`
- `partner_leads`
- `partner_campaigns`
- `partner_payouts`

---

# Module 9: Destination Intelligence

## Purpose

Show what travelers want from The Bahamas.

## Required metrics

- Most requested islands
- Most viewed islands
- Most planned islands
- Most booked islands
- Popular origin cities
- Popular origin countries
- Most requested hotels
- Most requested restaurants
- Most requested activities
- Unfulfilled user requests
- Seasonal demand trends
- Family vs honeymoon vs adventure demand

## Required future data model

- event tracking from chat, Explore, search, bookings, and content
- canonical places
- normalized islands

---

# Module 10: Content Performance

## Purpose

Show which content drives planning, booking, and partner value.

## Required metrics

- Article views
- Tip views
- Deal clicks
- Social video clicks
- Traveler story engagement
- Plan-this clicks
- Content-to-chat conversion
- Content-to-booking conversion
- Top performing island content

## Data sources

- Sanity
- analytics events
- Explore page tracking
- future content event table

---

# Module 11: Chat & AI

## Purpose

Track Buddy performance, costs, and demand signals.

## Required metrics

- AI cost today
- AI cost this month
- Cost per chat
- Cost per trip created
- Cost per booking
- Total messages
- Top requested topics
- Failed tool calls
- High-cost users/threads
- Chat-to-trip conversion

## Current data sources

- `chat_threads`
- `chat_messages`
- `ai_usage_log`
- Edge Function logs

---

# Module 12: Billing & APIs

## Purpose

Track API/service costs and credit risk.

## Required metrics

- Cost by service
- Anthropic cost
- Duffel usage
- LiteAPI usage
- Viator usage
- Deepgram usage
- OpenAI TTS usage
- Stripe fees
- Supabase costs
- API credit balances
- API key status

## Current data sources

- `api_credit_status`
- `api_usage_log`
- `ai_usage_log`
- service config inside admin code

---

# Module 13: Support

## Purpose

Handle user issues, booking problems, and internal follow-up.

## Required fields

- Ticket status
- Priority
- User
- Trip
- Booking
- Assigned admin
- Last response
- Internal notes

## Current data sources

- `support_tickets`
- `support_messages`

---

# Module 14: Admin & Audit

## Purpose

Secure the admin panel and create accountability.

## Required tables

- `admin_users`
- `admin_audit_log`
- `pii_access_log`
- `admin_notes`

## Required actions

- View admin users
- Activate/deactivate admins
- Change roles
- View audit log
- Filter by action/admin/entity
- Log every mutation
- Require reason for PII reveal

---

## Recommended build order

### Phase 1: Admin foundation

1. Apply `migrations/20260607_admin_core_tables.sql`.
2. Confirm admin auth works with `admin_users`.
3. Confirm audit log writes work.
4. Confirm PII reveal logging works.
5. Deploy admin app to Netlify.

### Phase 2: Navigation and module scaffolding

1. Add Revenue module shell.
2. Add Places module shell.
3. Add Partners module shell.
4. Add Destination Intelligence shell.
5. Add High-Intent Queue shell.
6. Add Admin Users shell.

### Phase 3: Data APIs

1. Add `/api/revenue/summary`.
2. Add `/api/places` after canonical places exist.
3. Add `/api/partners` after partner tables exist.
4. Add `/api/intelligence/destinations`.
5. Add `/api/high-intent`.
6. Add `/api/admin-users`.

### Phase 4: Strategic operations

1. Partner management.
2. Revenue attribution.
3. Content performance.
4. Tourism intelligence.
5. High-intent outreach workflow.

---

## Immediate next dev tasks

1. Apply admin core migration in Supabase.
2. Add visible admin module placeholders in the sidebar.
3. Add Admin Users page backed by `admin_users`.
4. Add Revenue page using existing `bookings`, `ai_usage_log`, and `api_credit_status`.
5. Add Places page after canonical places migration.
6. Add Partners page after partner schema is created.
