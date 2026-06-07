import type { ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Compass,
  CreditCard,
  FileText,
  HelpCircle,
  Home,
  MapPinned,
  MessageSquare,
  Plane,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

export type AdminModuleId =
  | 'overview'
  | 'revenue'
  | 'bookings'
  | 'concierge-orders'
  | 'payments'
  | 'travelers'
  | 'trips'
  | 'high-intent'
  | 'places'
  | 'partners'
  | 'destination-intelligence'
  | 'content-performance'
  | 'chat'
  | 'billing'
  | 'support'
  | 'admin-users'
  | 'audit';

export interface AdminNavItem {
  id: AdminModuleId;
  label: string;
  description: string;
  icon: ReactNode;
  badge?: string;
  href?: string;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  description: string;
  defaultOpen?: boolean;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'command-center',
    label: 'Command Center',
    description: 'Executive view, revenue, intelligence, and conversion opportunities.',
    defaultOpen: true,
    items: [
      { id: 'overview', label: 'Overview', description: 'Daily executive snapshot of users, trips, revenue, AI cost, and system activity.', icon: <Home size={17} /> },
      { id: 'revenue', label: 'Revenue', description: 'Revenue by product, channel, partner, booking type, and service line.', icon: <CircleDollarSign size={17} />, badge: 'New' },
      { id: 'destination-intelligence', label: 'Destination Intelligence', description: 'Most requested islands, hotels, activities, restaurants, origin markets, and unmet demand.', icon: <TrendingUp size={17} />, badge: 'New' },
      { id: 'high-intent', label: 'High-Intent Queue', description: 'Travelers likely to book, request concierge support, or need human follow-up.', icon: <Target size={17} />, badge: 'New' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Day-to-day traveler, trip, booking, concierge, payment, and support operations.',
    defaultOpen: true,
    items: [
      { id: 'bookings', label: 'Bookings', description: 'Flight, hotel, activity, restaurant, transfer, and service booking operations.', icon: <ClipboardList size={17} /> },
      { id: 'concierge-orders', label: 'Concierge Orders', description: 'Paid concierge trip plan orders from Stripe Checkout, assignment, fulfillment, and delivery.', icon: <CreditCard size={17} />, badge: 'New' },
      { id: 'payments', label: 'Payments & Receipts', description: 'Concierge payment reconciliation, Stripe references, receipt support, refunds, and source attribution.', icon: <CircleDollarSign size={17} />, badge: 'New' },
      { id: 'travelers', label: 'Travelers', description: 'User profiles, lifecycle, engagement, trips, bookings, and support context.', icon: <Users size={17} /> },
      { id: 'trips', label: 'Trips', description: 'Saved trips, itineraries, trip items, shared trips, and abandoned trip plans.', icon: <Compass size={17} /> },
      { id: 'support', label: 'Support', description: 'Support tickets, booking issues, user help, and internal follow-up.', icon: <HelpCircle size={17} /> },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    description: 'Supply, places, partners, campaigns, and content performance.',
    defaultOpen: true,
    items: [
      { id: 'places', label: 'Places', description: 'Canonical hotels, restaurants, attractions, activities, beaches, and source records.', icon: <MapPinned size={17} />, badge: 'New' },
      { id: 'partners', label: 'Partners', description: 'Partner profiles, tiers, leads, bookings, campaigns, commissions, and performance.', icon: <BriefcaseBusiness size={17} />, badge: 'New' },
      { id: 'content-performance', label: 'Content Performance', description: 'Articles, tips, deals, social videos, traveler stories, and conversion attribution.', icon: <FileText size={17} />, badge: 'New' },
    ],
  },
  {
    id: 'systems',
    label: 'Systems',
    description: 'AI, API, billing, admin access, and audit controls.',
    defaultOpen: false,
    items: [
      { id: 'chat', label: 'Chat & AI', description: 'Buddy usage, AI cost, tool calls, topics, and chat-to-trip conversion.', icon: <Bot size={17} /> },
      { id: 'billing', label: 'Billing & APIs', description: 'API credits, AI usage, provider costs, key status, and service health.', icon: <CreditCard size={17} /> },
      { id: 'admin-users', label: 'Admin Users', description: 'Admin roles, active status, access control, and team permissions.', icon: <Settings size={17} />, badge: 'New' },
      { id: 'audit', label: 'Audit Log', description: 'Admin activity, PII reveals, role changes, and mutation accountability.', icon: <ShieldCheck size={17} /> },
    ],
  },
];

export const ADMIN_MODULE_LOOKUP = ADMIN_NAV_GROUPS
  .flatMap(group => group.items)
  .reduce<Record<AdminModuleId, AdminNavItem>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<AdminModuleId, AdminNavItem>);

export const ADMIN_MODULE_SEQUENCE = ADMIN_NAV_GROUPS.flatMap(group => group.items.map(item => item.id));

export const SYSTEM_HEALTH_ITEMS = [
  { label: 'Supabase', status: 'connected', icon: <Building2 size={14} /> },
  { label: 'Bookings', status: 'monitor', icon: <Plane size={14} /> },
  { label: 'AI/API', status: 'monitor', icon: <Activity size={14} /> },
  { label: 'Revenue', status: 'pending', icon: <BarChart3 size={14} /> },
  { label: 'Messaging', status: 'pending', icon: <MessageSquare size={14} /> },
];
