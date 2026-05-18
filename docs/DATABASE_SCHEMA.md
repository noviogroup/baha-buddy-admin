# Database Schema Reference

Complete schema for all tables the admin panel reads from. Matches the V2 Supabase migrations.

## Core Tables

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Matches auth.users(id) |
| display_name | text | From onboarding screen 2 |
| email | text | From onboarding screen 6 |
| country | text | Auto-detected, screen 3 |
| city | text | Auto-detected, screen 3 |
| party_type | text | solo / couple / family / friends |
| party_size | int | Default 1 |
| children_count | int | Default 0 |
| children_ages | int[] | Ages array |
| interest_tags | text[] | Vibe categories from screen 5 |
| engagement_score | int | Auto-tracked (0–100) |
| voice_enabled | boolean | Default true |
| stripe_customer_id | text | Set on first payment |
| dietary_needs | text[] | Optional preferences |
| accessibility_needs | text[] | Optional preferences |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### trips
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | Owner |
| name | text | Auto-generated or user-edited |
| status | text | draft / planned / booked / active / completed / cancelled |
| date_start | date | |
| date_end | date | |
| islands | text[] | Selected destination islands |
| party_type | text | Trip-specific override |
| party_size | int | |
| budget_estimate | numeric(12,2) | |
| budget_actual | numeric(12,2) | |
| chat_thread_id | uuid | Linked conversation |
| hero_image_url | text | |
| collaborator_ids | uuid[] | |

### bookings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→auth.users | |
| trip_id | uuid FK→trips | |
| type | text | full_trip / accommodation / flight / activity |
| status | text | pending / confirmed / failed / cancelled / refunded |
| amount | decimal(10,2) | |
| currency | text | Default 'usd' |
| stripe_payment_intent_id | text | From Stripe |
| supplier_ref | text | |
| paid_at | timestamptz | |

### chat_messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| thread_id | uuid FK→chat_threads | |
| role | text | user / assistant / system |
| content | text | |
| card_type | text | none / destination / hotel / flight / dayPlan / activity / map / summary / payment / mixed |
| card_data | jsonb | Structured card JSON |

### ai_usage_log
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→auth.users | |
| thread_id | uuid | |
| model | text | e.g. claude-sonnet-4-5 |
| input_tokens | int | |
| output_tokens | int | |
| estimated_cost_usd | decimal(10,6) | Calculated at Sonnet $3/$15 rates |

## Admin Tables (from migrations)

### support_tickets
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| subject | text | |
| status | text | open / in_progress / resolved / closed |
| priority | text | low / medium / high / critical |
| assigned_to | text | Admin name |

### support_messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| ticket_id | uuid FK→support_tickets | |
| sender_type | text | user / admin |
| sender_id | uuid | |
| content | text | |

### api_usage_log
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| service | text | liteapi / viator / duffel / deepgram / openai_tts / stripe / open_meteo |
| action | text | e.g. search_hotels, transcribe |
| edge_function | text | Which Edge Function made the call |
| status_code | int | HTTP response status |
| latency_ms | int | Round-trip time |
| estimated_cost_usd | decimal(10,6) | |

### api_credit_status
| Column | Type | Notes |
|--------|------|-------|
| service | text UNIQUE | anthropic / liteapi / viator / duffel / deepgram / openai / stripe / supabase / open_meteo |
| display_name | text | Human-readable |
| plan_tier | text | sandbox / test / pay-as-you-go / pro / free |
| credit_balance | decimal(12,2) | Remaining credit |
| monthly_limit | decimal(12,2) | Budget cap |
| current_month_usage | decimal(12,2) | Running total |
| api_key_status | text | active / expiring / expired / revoked / missing |
| dashboard_url | text | Link to provider billing |
| notes | text | Context for the team |

## Views

| View | Source | Purpose |
|------|--------|---------|
| ai_daily_costs | ai_usage_log | Daily cost by model |
| ai_user_costs_30d | ai_usage_log | Per-user cost, 30-day rollup |
| api_daily_usage | api_usage_log | Daily API cost by service + action |
| all_daily_costs | ai_usage_log + api_usage_log | Combined daily across everything |
| stripe_revenue_summary | bookings | Daily revenue from confirmed bookings |
