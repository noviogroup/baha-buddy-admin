'use client';

import { CreditCard, ExternalLink, Save, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { bookingRecoveryGuidance, recoveryToneClass } from '@/lib/booking-recovery';

type BookingRow = {
  id: string;
  user_id?: string | null;
  trip_id?: string | null;
  booking_type: string | null;
  reference_id: string | null;
  provider: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  updated_at?: string;
  stripe_payment_intent_id: string | null;
  paid_at?: string | null;
  provider_reference?: string | null;
  source_surface?: string | null;
  payment_status?: string | null;
  provider_status?: string | null;
  failure_state?: string | null;
};

function money(value: unknown, currency = 'USD') {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  const amount = Number.isFinite(n) ? n : 0;
  return `${currency === 'USD' ? '$' : `${currency} `}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string | null }) {
  const value = status || 'unknown';
  const cls = value === 'confirmed'
    ? 'bg-status-success-bg text-status-success'
    : value === 'failed' || value === 'cancelled' || value === 'refunded'
      ? 'bg-status-danger-bg text-status-danger'
      : 'bg-status-warning-bg text-status-warning';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{value}</span>;
}

export function BookingDetailPanel({ booking, onClose, onChanged }: { booking: BookingRow; onClose: () => void; onChanged: () => Promise<void> | void }) {
  const recovery = bookingRecoveryGuidance(booking.failure_state);

  const updateStatus = async (status: string) => {
    const res = await apiFetch('/api/bookings', {
      method: 'PATCH',
      body: JSON.stringify({ id: booking.id, status }),
    });
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error || `Status update failed: ${res.status}`);
    await onChanged();
  };

  return (
    <div className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-hairline baha-gradient-card flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-brand-blue mb-1">Booking detail</div>
          <h3 className="text-lg font-display font-bold text-ink tracking-tight">
            {booking.booking_type || 'Booking'} · {money(booking.amount, booking.currency || 'USD')}
          </h3>
          <div className="text-xs text-body mt-1 capitalize">Provider: {booking.provider || '—'} · Created: {new Date(booking.created_at).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-white/70" title="Close detail"><X size={17} /></button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-3 gap-4 text-sm">
        <div className="border border-hairline rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">Payment</div>
          <div className="text-body flex items-center gap-2"><CreditCard size={14} className="text-brand-blue" /> {booking.stripe_payment_intent_id || 'No Stripe payment intent'}</div>
          <div className="text-xs text-body mt-2">Payment status: <span className="font-semibold capitalize">{booking.payment_status || booking.status || 'pending'}</span></div>
          <div className="text-xs text-muted mt-2">Paid at: {booking.paid_at ? new Date(booking.paid_at).toLocaleString() : '—'}</div>
        </div>

        <div className="border border-hairline rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">References</div>
          <div className="text-xs text-body">Booking ID: {booking.id}</div>
          <div className="text-xs text-body mt-1">Reference ID: {booking.reference_id || '—'}</div>
          <div className="text-xs text-body mt-1">Provider ref: {booking.provider_reference || '—'}</div>
          <div className="text-xs text-body mt-1">Trip ID: {booking.trip_id || '—'}</div>
          <div className="text-xs text-body mt-1">User ID: {booking.user_id || '—'}</div>
        </div>

        <div className="border border-hairline rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">Status controls</div>
          <div className="flex flex-wrap gap-2">
            {['pending', 'confirmed', 'failed', 'cancelled', 'refunded'].map(status => (
              <button key={status} onClick={() => updateStatus(status)} className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold capitalize hover:bg-surface inline-flex items-center gap-1">
                <Save size={11} /> {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg bg-surface p-3"><span className="font-bold text-ink">Source:</span> {booking.source_surface || 'unknown'}</div>
        <div className="rounded-lg bg-surface p-3"><span className="font-bold text-ink">Provider status:</span> {booking.provider_status || 'pending'}</div>
        <div className="rounded-lg bg-surface p-3"><span className="font-bold text-ink">Recovery state:</span> {recovery.label}</div>
      </div>

      <div className="px-5 pb-5">
        <section aria-label="Booking recovery checklist" className={`rounded-xl border p-4 ${recoveryToneClass(recovery.tone)}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold mb-1">Recovery checklist</div>
              <h4 className="text-base font-display font-bold text-ink">{recovery.label}</h4>
              <p className="mt-1 text-sm leading-5 text-body">{recovery.summary}</p>
            </div>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">{recovery.priority}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">{recovery.nextAction}</p>
          <ul className="mt-3 grid gap-2 text-xs text-body">
            {recovery.checklist.map(item => <li key={item} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}
          </ul>
        </section>
      </div>

      <div className="px-5 pb-5 text-xs text-muted flex items-center gap-1.5">
        <ExternalLink size={12} /> Provider references can later deep-link to Stripe, Duffel, LiteAPI, Viator, or concierge records.
      </div>
    </div>
  );
}
