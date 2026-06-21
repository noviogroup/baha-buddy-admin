// Database types matching Supabase schema from V2 migrations

export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Partial<UserRow> & Pick<UserRow, 'id' | 'display_name'>; Update: Partial<UserRow>; Relationships: [] };
      trips: { Row: TripRow; Insert: Partial<TripRow> & Pick<TripRow, 'id' | 'user_id' | 'name'>; Update: Partial<TripRow>; Relationships: [] };
      chat_threads: { Row: ChatThreadRow; Insert: Partial<ChatThreadRow> & Pick<ChatThreadRow, 'id' | 'user_id'>; Update: Partial<ChatThreadRow>; Relationships: [] };
      chat_messages: { Row: ChatMessageRow; Insert: Partial<ChatMessageRow> & Pick<ChatMessageRow, 'id' | 'thread_id' | 'role' | 'content'>; Update: Partial<ChatMessageRow>; Relationships: [] };
      trip_accommodations: { Row: TripAccommodationRow; Insert: Partial<TripAccommodationRow>; Update: Partial<TripAccommodationRow>; Relationships: [] };
      trip_flights: { Row: TripFlightRow; Insert: Partial<TripFlightRow>; Update: Partial<TripFlightRow>; Relationships: [] };
      trip_activities: { Row: TripActivityRow; Insert: Partial<TripActivityRow>; Update: Partial<TripActivityRow>; Relationships: [] };
      trip_collaborators: { Row: TripCollaboratorRow; Insert: Partial<TripCollaboratorRow>; Update: Partial<TripCollaboratorRow>; Relationships: [] };
      bookings: { Row: BookingRow; Insert: Partial<BookingRow> & Pick<BookingRow, 'id' | 'user_id' | 'booking_type' | 'status' | 'currency'>; Update: Partial<BookingRow>; Relationships: [] };
      ai_usage_log: { Row: AiUsageLogRow; Insert: Partial<AiUsageLogRow>; Update: Partial<AiUsageLogRow>; Relationships: [] };
      user_documents: { Row: UserDocumentRow; Insert: Partial<UserDocumentRow>; Update: Partial<UserDocumentRow>; Relationships: [] };
      user_payments: { Row: UserPaymentRow; Insert: Partial<UserPaymentRow>; Update: Partial<UserPaymentRow>; Relationships: [] };
      ugc_content: { Row: UgcContentRow; Insert: Partial<UgcContentRow>; Update: Partial<UgcContentRow>; Relationships: [] };
      google_places: { Row: GooglePlaceRow; Insert: Partial<GooglePlaceRow>; Update: Partial<GooglePlaceRow>; Relationships: [] };
      support_tickets: { Row: SupportTicketRow; Insert: Partial<SupportTicketRow>; Update: Partial<SupportTicketRow>; Relationships: [] };
      support_messages: { Row: SupportMessageRow; Insert: Partial<SupportMessageRow>; Update: Partial<SupportMessageRow>; Relationships: [] };
      api_credit_status: { Row: ApiCreditStatusRow; Insert: Partial<ApiCreditStatusRow>; Update: Partial<ApiCreditStatusRow>; Relationships: [] };
      admin_users: { Row: AdminUserRow; Insert: Partial<AdminUserRow> & Pick<AdminUserRow, 'id' | 'email' | 'display_name'>; Update: Partial<AdminUserRow>; Relationships: [] };
      admin_audit_log: { Row: AdminAuditLogRow; Insert: Partial<AdminAuditLogRow> & Pick<AdminAuditLogRow, 'admin_email' | 'action' | 'entity_type'>; Update: never; Relationships: [] };
      admin_notes: { Row: AdminNoteRow; Insert: Partial<AdminNoteRow> & Pick<AdminNoteRow, 'admin_id' | 'admin_email' | 'entity_type' | 'entity_id' | 'body'>; Update: Partial<AdminNoteRow>; Relationships: [] };
      pii_access_log: { Row: PiiAccessLogRow; Insert: Partial<PiiAccessLogRow> & Pick<PiiAccessLogRow, 'admin_email' | 'entity_type' | 'entity_id' | 'field' | 'reason'>; Update: never; Relationships: [] };
      default_header_images: { Row: DefaultHeaderImageRow; Insert: Partial<DefaultHeaderImageRow> & Pick<DefaultHeaderImageRow, 'title' | 'header_type' | 'scope_key' | 'desktop_image_url' | 'alt_text'>; Update: Partial<DefaultHeaderImageRow>; Relationships: [] };
      launch_readiness_tasks: { Row: LaunchReadinessTaskRow; Insert: Partial<LaunchReadinessTaskRow> & Pick<LaunchReadinessTaskRow, 'title'>; Update: Partial<LaunchReadinessTaskRow>; Relationships: [] };
      communication_events: { Row: CommunicationEventRow; Insert: Partial<CommunicationEventRow> & Pick<CommunicationEventRow, 'user_id' | 'type' | 'category' | 'title' | 'body' | 'channels' | 'idempotency_key'>; Update: Partial<CommunicationEventRow>; Relationships: [] };
      communication_deliveries: { Row: CommunicationDeliveryRow; Insert: Partial<CommunicationDeliveryRow> & Pick<CommunicationDeliveryRow, 'event_id' | 'user_id' | 'channel' | 'status'>; Update: Partial<CommunicationDeliveryRow>; Relationships: [] };
    };
    Views: {
      ai_daily_costs: { Row: AiDailyCostRow; Relationships: [] };
      ai_user_costs_30d: { Row: AiUserCost30dRow; Relationships: [] };
      api_daily_usage: { Row: Record<string, unknown>; Relationships: [] };
      all_daily_costs: { Row: Record<string, unknown>; Relationships: [] };
      stripe_revenue_summary: { Row: Record<string, unknown>; Relationships: [] };
      admin_action_summary: { Row: AdminActionSummaryRow; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ─── Table Rows ───

export interface UserRow {
  id: string;
  display_name: string;
  email: string | null;
  country: string | null;
  city: string | null;
  party_type: 'solo' | 'couple' | 'family' | 'friends';
  party_size: number;
  children_count: number;
  children_ages: number[];
  interest_tags: string[];
  engagement_score: number;
  voice_enabled: boolean;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  dietary_needs: string[] | null;
  accessibility_needs: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface TripRow {
  id: string;
  user_id: string;
  name: string;
  status: 'draft' | 'planned' | 'booked' | 'active' | 'completed' | 'cancelled';
  date_start: string | null;
  date_end: string | null;
  islands: string[];
  party_type: string;
  party_size: number;
  budget_estimate: number | null;
  budget_actual: number | null;
  chat_thread_id: string | null;
  hero_image_url: string | null;
  collaborator_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ChatThreadRow { id: string; trip_id: string | null; user_id: string; last_message_preview: string | null; created_at: string; updated_at: string; }
export interface ChatMessageRow { id: string; thread_id: string; role: 'user' | 'assistant' | 'system'; content: string; card_type: 'none' | 'destination' | 'hotel' | 'flight' | 'dayPlan' | 'activity' | 'map' | 'summary' | 'payment' | 'mixed'; card_data: Record<string, unknown> | null; created_at: string; }
export interface TripAccommodationRow {
  id: string;
  trip_id: string;
  place_id: string | null;
  liteapi_hotel_id: string | null;
  liteapi_rate_id: string | null;
  liteapi_prebook_id: string | null;
  name: string;
  island: string | null;
  check_in: string | null;
  check_out: string | null;
  price_per_night: number | null;
  total_price: number | null;
  currency: string | null;
  nights: number | null;
  guests: number | null;
  booking_reference: string | null;
  stripe_payment_intent_id: string | null;
  photo_url: string | null;
  address: string | null;
  description: string | null;
  property_type: string | null;
  gallery_images: string[] | null;
  amenities: string[] | null;
  stars: number | null;
  rating: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}
export interface TripFlightRow { id: string; trip_id: string; origin: string; destination: string; departure_at: string | null; arrival_at: string | null; airline: string | null; booking_reference: string | null; price: number | null; duffel_offer_id: string | null; created_at: string; updated_at: string; }
export interface TripActivityRow { id: string; trip_id: string; day_number: number; time_slot: 'morning' | 'afternoon' | 'evening'; activity_name: string; activity_type: string | null; place_id: string | null; notes: string | null; source_type: string | null; source_id: string | null; provider: string | null; provider_activity_id: string | null; image_url: string | null; price: number | null; currency: string; metadata: Record<string, unknown>; sort_order: number; created_at: string; updated_at: string; }
export interface TripCollaboratorRow { id: string; trip_id: string; user_id: string; role: 'owner' | 'editor' | 'viewer'; invited_at: string; accepted_at: string | null; }
export interface BookingRow { id: string; user_id: string; trip_id: string | null; booking_type: string; reference_id: string | null; provider: string | null; status: 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded'; amount: number | null; currency: string; stripe_payment_intent_id: string | null; paid_at: string | null; created_at: string; updated_at: string; }
export interface AiUsageLogRow { id: string; user_id: string | null; thread_id: string | null; model: string; input_tokens: number; output_tokens: number; estimated_cost_usd: number; created_at: string; }
export interface UserDocumentRow { id: string; user_id: string; document_type: 'passport' | 'visa' | 'insurance' | 'other'; encrypted_payload: string | null; reminder_at: string | null; created_at: string; updated_at: string; }
export interface UserPaymentRow { id: string; user_id: string; stripe_customer_id: string | null; stripe_payment_method_id: string | null; created_at: string; updated_at: string; }
export interface UgcContentRow { id: string; user_id: string; trip_id: string | null; content_type: 'video' | 'photo' | 'story'; storage_path: string; caption: string | null; moderation_status: 'pending' | 'approved' | 'rejected'; created_at: string; updated_at: string; }
export interface GooglePlaceRow { id: string; place_id: string; name: string; type: string | null; island: string | null; rating: number | null; photo_url: string | null; description: string | null; amenities: string[] | null; cuisine_type: string | null; vibe_tags: string[] | null; kid_friendly: boolean; }

// ─── View Rows ───

export interface AiDailyCostRow { date: string; model: string; requests: number; total_input_tokens: number; total_output_tokens: number; total_cost_usd: number; }
export interface AiUserCost30dRow { user_id: string; requests: number; total_input_tokens: number; total_output_tokens: number; total_cost_usd: number; }

// ─── Admin-specific types ───

export interface AdminStats { totalUsers: number; newUsersToday: number; newUsersWeek: number; activeTrips: number; totalTrips: number; tripsByStatus: Record<string, number>; totalBookings: number; totalRevenue: number; revenueThisMonth: number; aiCostToday: number; aiCostMonth: number; totalMessages: number; avgMessagesPerUser: number; topIslands: { island: string; count: number }[]; }
export interface SupportTicketRow { id: string; user_id: string; subject: string; status: 'open' | 'in_progress' | 'resolved' | 'closed'; priority: 'low' | 'medium' | 'high' | 'critical'; assigned_to: string | null; created_at: string; updated_at: string; }
export interface SupportMessageRow { id: string; ticket_id: string; sender_type: 'user' | 'admin'; sender_id: string | null; content: string; created_at: string; }

export type AdminRole = 'super_admin' | 'admin' | 'viewer';
export interface AdminUserRow { id: string; email: string; display_name: string; role: AdminRole; active: boolean; last_seen_at: string | null; created_at: string; updated_at: string; }
export interface AdminAuditLogRow { id: string; admin_id: string | null; admin_email: string; action: string; entity_type: string; entity_id: string | null; before_state: Record<string, unknown> | null; after_state: Record<string, unknown> | null; metadata: Record<string, unknown>; ip_address: string | null; user_agent: string | null; created_at: string; }
export interface AdminNoteRow { id: string; admin_id: string; admin_email: string; entity_type: string; entity_id: string; body: string; pinned: boolean; created_at: string; updated_at: string; }
export interface PiiAccessLogRow { id: string; admin_id: string | null; admin_email: string; entity_type: string; entity_id: string; field: string; reason: string; ip_address: string | null; user_agent: string | null; created_at: string; }
export interface AdminActionSummaryRow { admin_email: string; action: string; event_count: number; last_at: string; events_7d: number; events_30d: number; }
export interface ApiCreditStatusRow { id: string; service: string; display_name: string; plan_tier: string | null; credit_balance: number | null; credit_currency: string; monthly_limit: number | null; current_month_usage: number; billing_period_start: string | null; billing_period_end: string | null; api_key_status: string; api_key_last_verified: string | null; notes: string | null; dashboard_url: string | null; created_at: string; updated_at: string; }

export type CommunicationType = 'trip_invite' | 'invite_accepted' | 'collaborator_update' | 'booking_confirmed' | 'booking_failed' | 'payment_failed' | 'trip_reminder' | 'support_update' | 'admin_alert' | 'buddy_message';
export type CommunicationCategory = 'trip_reminders' | 'booking_updates' | 'trip_collaboration' | 'buddy_messages' | 'support_updates';
export type CommunicationChannel = 'in_app' | 'email' | 'push';
export type CommunicationStatus = 'pending' | 'sent' | 'partial' | 'failed' | 'skipped';
export type CommunicationDeliveryStatus = 'pending' | 'sent' | 'skipped' | 'failed';

export interface CommunicationEventRow {
  id: string;
  user_id: string;
  type: CommunicationType;
  category: CommunicationCategory;
  title: string;
  body: string;
  route: string | null;
  payload: Record<string, unknown>;
  channels: CommunicationChannel[];
  idempotency_key: string;
  status: CommunicationStatus;
  created_at: string;
  updated_at: string;
}

export interface CommunicationDeliveryRow {
  id: string;
  event_id: string;
  user_id: string;
  channel: CommunicationChannel;
  status: CommunicationDeliveryStatus;
  provider: string | null;
  provider_message_id: string | null;
  target: string | null;
  error: string | null;
  attempted_at: string;
  created_at: string;
}

export interface DefaultHeaderImageRow {
  id: string;
  title: string;
  description: string | null;
  header_type: 'global' | 'island' | 'itinerary_category' | 'business_type' | 'empty_state';
  scope_key: string;
  island: string | null;
  category: string | null;
  business_type: string | null;
  desktop_image_url: string;
  mobile_image_url: string | null;
  card_image_url: string | null;
  app_detail_image_url: string | null;
  alt_text: string;
  is_active: boolean;
  usage_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type LaunchReadinessPriority = 'p0' | 'p1' | 'p2' | 'p3';
export type LaunchReadinessStatus = 'todo' | 'in_progress' | 'needs_approval' | 'approved' | 'blocked' | 'done';

export interface LaunchReadinessTaskRow {
  id: string;
  source_key: string | null;
  title: string;
  description: string | null;
  workstream: string;
  priority: LaunchReadinessPriority;
  status: LaunchReadinessStatus;
  owner: string | null;
  approver_email: string | null;
  approved_at: string | null;
  due_date: string | null;
  scenario_ref: string | null;
  source_doc_path: string | null;
  evidence_url: string | null;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
