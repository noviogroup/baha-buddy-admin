'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

// ═══════════════════════════════════════════════════════════════════════════
// CANCEL BOOKINGS MODAL — shared by Phase 2 #21 surfaces
// ═══════════════════════════════════════════════════════════════════════════
// Reusable modal for cancelling 1..N bookings. Used by:
//   - Trip Detail Admin tab        ("Cancel trip" — all active bookings)
//   - Trip Detail Bookings tab     (per-row cancel button)
//   - User Detail Bookings tab     (per-row cancel button)
//
// The modal owns its own form state (reason, cancel_at_supplier, submitting,
// per-booking results). It iterates the bookings array and POSTs each one to
// /api/booking-cancel sequentially so the audit log captures each as a
// separate event (and partial failures don't poison the batch).
//
// Props:
//   open       — modal visibility flag (parent controls)
//   bookings   — array of booking objects to cancel (1 or more)
//   title      — modal header text (e.g. "Cancel flight booking" or
//                "Cancel trip — Exuma Adventure")
//   onClose    — fired when the admin dismisses the modal
//   onComplete — optional; fired after the batch finishes (regardless of
//                errors), typically wired to the parent's reload()
//
// State reset: the modal resets reason/results 200ms after onClose fires,
// avoiding a janky "form contents flash" during the close transition.
// ═══════════════════════════════════════════════════════════════════════════

const DOLLAR = '$';
const fmt$ = (n: number) => DOLLAR + n.toLocaleString();

export interface CancelBookingsModalProps {
  open: boolean;
  bookings: any[];
  title: string;
  onClose: () => void;
  onComplete?: () => void;
}

export function CancelBookingsModal({
  open, bookings, title, onClose, onComplete,
}: CancelBookingsModalProps) {
  const [reason, setReason] = useState('');
  const [cancelAtSupplier, setCancelAtSupplier] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ done: number; total: number; errors: string[] } | null>(null);

  const total = bookings.reduce((s: number, b: any) => s + (parseFloat(b.amount) || 0), 0);

  const close = () => {
    if (submitting) return;
    onClose();
    setTimeout(() => {
      setReason('');
      setResults(null);
      setCancelAtSupplier(true);
    }, 200);
  };

  const handleConfirm = async () => {
    if (reason.trim().length < 3) return;
    setSubmitting(true);
    const errors: string[] = [];
    let done = 0;
    setResults({ done: 0, total: bookings.length, errors: [] });

    for (const b of bookings) {
      try {
        const res = await apiFetch('/api/booking-cancel', {
          method: 'POST',
          body: JSON.stringify({
            booking_id: b.id,
            reason: reason.trim(),
            cancel_at_supplier: cancelAtSupplier,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          errors.push(`${b.booking_type} ${b.id.slice(0, 8)}…: ${err.error || `HTTP ${res.status}`}`);
        }
      } catch (err: any) {
        errors.push(`${b.id.slice(0, 8)}…: ${err.message}`);
      }
      done += 1;
      setResults({ done, total: bookings.length, errors: [...errors] });
    }

    setSubmitting(false);
    onComplete?.();
  };

  if (!open) return null;

  const isSingle = bookings.length === 1;

  return (
    <div
      className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4"
      onClick={close}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <h3 className="text-base font-display font-bold text-ink">{title}</h3>
          <button
            onClick={close}
            disabled={submitting}
            className="text-muted hover:text-body disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3 overflow-y-auto">
          {!results && (
            <>
              <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-status-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-ink">
                    {isSingle ? (
                      <>This will cancel <strong>1 {bookings[0].booking_type} booking</strong> for <strong>{fmt$(total)}</strong>. The action is audited and cannot be undone.</>
                    ) : (
                      <>This will cancel <strong>{bookings.length} bookings</strong> totaling <strong>{fmt$(total)}</strong>. Each cancellation is audited and cannot be undone.</>
                    )}
                  </div>
                </div>
              </div>

              {!isSingle && (
                <div className="bg-surface rounded-lg p-3">
                  <div className="text-[10px] text-muted uppercase tracking-wider font-medium mb-1.5">Bookings to cancel</div>
                  <ul className="flex flex-col gap-1">
                    {bookings.map((b: any) => (
                      <li key={b.id} className="text-[11px] text-body flex items-center justify-between">
                        <span className="font-mono">{b.booking_type} · {b.id.slice(0, 8)}…</span>
                        <span className="font-semibold text-ink">{fmt$(parseFloat(b.amount) || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium mb-1 block">
                  Reason for cancellation <span className="text-status-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer requested refund due to medical emergency…"
                  rows={3}
                  className="w-full border border-hairline rounded-lg px-3 py-2 text-sm outline-none resize-y focus:border-brand-blue font-body"
                />
                <div className="text-[10px] text-muted mt-1">
                  Minimum 3 characters. Captured in audit log and visible to other admins.
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cancelAtSupplier}
                  onChange={(e) => setCancelAtSupplier(e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-xs font-medium text-ink">
                    Cancel at supplier {cancelAtSupplier ? '(recommended)' : ''}
                  </div>
                  <div className="text-[10px] text-muted">
                    Uncheck only if the supplier has already processed the cancellation and our DB row is stale.
                  </div>
                </div>
              </label>
            </>
          )}

          {results && (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-ink">
                {results.done}/{results.total} booking{results.total === 1 ? '' : 's'} processed
              </div>
              <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-blue transition-all"
                  style={{ width: `${(results.done / results.total) * 100}%` }}
                />
              </div>
              {results.errors.length > 0 ? (
                <div className="bg-status-danger-bg border border-status-danger/30 rounded-lg p-3">
                  <div className="text-xs font-semibold text-status-danger mb-1">
                    {results.errors.length} error{results.errors.length === 1 ? '' : 's'}
                  </div>
                  <ul className="text-[11px] text-ink flex flex-col gap-0.5">
                    {results.errors.map((e, i) => <li key={i} className="font-mono">{e}</li>)}
                  </ul>
                </div>
              ) : results.done === results.total && !submitting && (
                <div className="bg-status-success-bg border border-status-success/30 rounded-lg p-3 text-xs text-status-success font-medium">
                  {isSingle ? 'Cancellation succeeded. Audit log entry written.' : 'All cancellations succeeded. Audit log entries written.'}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-hairline flex items-center justify-end gap-2">
          <button
            onClick={close}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg border border-hairline text-xs text-body font-medium hover:border-brand-blue disabled:opacity-50"
          >
            {results ? 'Close' : 'Cancel'}
          </button>
          {!results && (
            <button
              onClick={handleConfirm}
              disabled={submitting || reason.trim().length < 3 || bookings.length === 0}
              className="px-3 py-1.5 rounded-lg bg-status-danger text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 hover:opacity-90"
            >
              {submitting
                ? 'Processing…'
                : isSingle
                  ? 'Cancel this booking'
                  : `Cancel ${bookings.length} bookings`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
