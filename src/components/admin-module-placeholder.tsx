'use client';

import { ArrowRight, CheckCircle2, Clock, Database, Route, ShieldCheck } from 'lucide-react';
import { ADMIN_MODULE_LOOKUP, type AdminModuleId } from '@/lib/admin-navigation';

const MODULE_DETAILS: Partial<Record<AdminModuleId, {
  purpose: string;
  metrics: string[];
  nextSteps: string[];
  dependency?: string;
}>> = {
  revenue: {
    purpose: 'Track money across bookings, concierge offers, partner subscriptions, sponsored campaigns, tours, and Baha Visa referrals.',
    metrics: ['Revenue today', 'Revenue this month', 'Gross booking value', 'Net revenue', 'Revenue by category', 'Revenue per user', 'Revenue per partner'],
    nextSteps: ['Add revenue summary API', 'Normalize booking categories', 'Create revenue_events table later', 'Connect Stripe and booking data'],
    dependency: 'Booking lifecycle must be validated before revenue is treated as official.',
  },
  'high-intent': {
    purpose: 'Surface travelers likely to convert so the team can follow up with concierge, booking, or visa/travel-document support.',
    metrics: ['Created a trip', 'Asked about booking', 'Has budget estimate', 'Clicked checkout', 'Asked about hotels/flights', 'Returned multiple times'],
    nextSteps: ['Define intent scoring rules', 'Add traveler_intent_events table', 'Build high-intent API', 'Add assignment/status workflow'],
    dependency: 'Requires event tracking from chat, trips, checkout, and content.',
  },
  places: {
    purpose: 'Manage the canonical place inventory across TripAdvisor, Google Places, partner data, and manual curation.',
    metrics: ['Active places', 'Verified places', 'Partner places', 'Duplicate candidates', 'Hidden places', 'Source conflicts'],
    nextSteps: ['Create canonical places table', 'Create place_sources table', 'Backfill TripAdvisor', 'Backfill Google Places', 'Build merge/review UI'],
    dependency: 'Requires canonical places migration before this becomes operational.',
  },
  partners: {
    purpose: 'Manage hotels, tour operators, restaurants, transportation providers, guides, and sponsored ecosystem partners.',
    metrics: ['Active partners', 'Partner tier', 'Partner leads', 'Partner bookings', 'Partner revenue', 'Campaign performance'],
    nextSteps: ['Create partner schema', 'Link partners to places', 'Add lead tracking', 'Add partner tiers', 'Add campaign tracking'],
    dependency: 'Best built after canonical places exists.',
  },
  'destination-intelligence': {
    purpose: 'Show what travelers want from The Bahamas, where demand is forming, and what requests are unfulfilled.',
    metrics: ['Most requested islands', 'Most planned islands', 'Most booked islands', 'Popular origin cities', 'Most requested hotels', 'Unfulfilled requests'],
    nextSteps: ['Normalize island analytics', 'Track chat demand signals', 'Track Explore views', 'Connect booking/category attribution'],
    dependency: 'Requires event tracking and canonical places for accurate reporting.',
  },
  'content-performance': {
    purpose: 'Measure which articles, tips, deals, videos, and stories drive planning, chats, bookings, and partner value.',
    metrics: ['Article views', 'Deal clicks', 'Plan-this clicks', 'Content-to-chat conversion', 'Content-to-booking conversion'],
    nextSteps: ['Define content event schema', 'Connect Sanity content IDs', 'Track Plan this actions', 'Build attribution reports'],
    dependency: 'Requires analytics events from web/mobile Explore surfaces.',
  },
  'admin-users': {
    purpose: 'Manage admin roles, active status, access controls, and operational accountability.',
    metrics: ['Active admins', 'Super admins', 'Recent admin activity', 'PII reveals', 'Role changes'],
    nextSteps: ['Add admin users API', 'Add role update action', 'Add deactivate action', 'Log every role/status mutation'],
    dependency: 'Admin core tables are now live; audit hardening migration has been applied.',
  },
};

interface AdminModulePlaceholderProps {
  moduleId: AdminModuleId;
}

export function AdminModulePlaceholder({ moduleId }: AdminModulePlaceholderProps) {
  const nav = ADMIN_MODULE_LOOKUP[moduleId];
  const details = MODULE_DETAILS[moduleId];

  if (!nav || !details) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              {nav.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-display font-bold text-ink tracking-tight">{nav.label}</h2>
                {nav.badge && <span className="text-[10px] bg-brand-gold-light text-status-warning px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">{nav.badge}</span>}
              </div>
              <p className="text-sm text-body max-w-3xl leading-relaxed">{details.purpose}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-warning bg-status-warning-bg px-3 py-1 rounded-full">
            <Clock size={13} /> Module shell
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Database size={16} className="text-brand-blue" />
            <h3 className="text-sm font-semibold text-ink">Core metrics</h3>
          </div>
          <div className="flex flex-col gap-2">
            {details.metrics.map(metric => (
              <div key={metric} className="flex items-center gap-2 text-sm text-body">
                <CheckCircle2 size={14} className="text-status-success" />
                {metric}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Route size={16} className="text-brand-blue" />
            <h3 className="text-sm font-semibold text-ink">Build steps</h3>
          </div>
          <div className="flex flex-col gap-2">
            {details.nextSteps.map(step => (
              <div key={step} className="flex items-center gap-2 text-sm text-body">
                <ArrowRight size={14} className="text-muted" />
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-brand-blue" />
            <h3 className="text-sm font-semibold text-ink">Dependency</h3>
          </div>
          <p className="text-sm text-body leading-relaxed">{details.dependency}</p>
        </div>
      </div>
    </div>
  );
}
