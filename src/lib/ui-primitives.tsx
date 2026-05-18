'use client';

/**
 * Shared UI primitives for admin pages.
 *
 * Today this is a partial duplicate of definitions inside src/app/page.tsx —
 * the dashboard root keeps its own copies for stability while we add detail
 * pages. A cleanup pass once all Phase 2 detail pages exist (#17 Trip, #18
 * Flight, #19 Hotel, #22 User) should delete the in-page.tsx copies and
 * route all imports through here.
 *
 * If you change STATUS_COLORS, CHART, or any primitive below, mirror the
 * change in src/app/page.tsx until that cleanup pass.
 */

import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Brand tokens (mirror tailwind.config.js for inline style overrides) ─
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:       { bg: '#F4F4F5', text: '#52525B' },
  planned:     { bg: '#FEF9C3', text: '#854D0E' },
  booked:      { bg: '#EAF2FB', text: '#1E5BA8' },
  active:      { bg: '#DCFCE7', text: '#166534' },
  completed:   { bg: '#F4F4F5', text: '#3F3F46' },
  cancelled:   { bg: '#FEE2E2', text: '#991B1B' },
  confirmed:   { bg: '#DCFCE7', text: '#166534' },
  pending:     { bg: '#FEF9C3', text: '#854D0E' },
  failed:      { bg: '#FEE2E2', text: '#991B1B' },
  refunded:    { bg: '#FEF8E6', text: '#A16207' },
  open:        { bg: '#FEF9C3', text: '#854D0E' },
  in_progress: { bg: '#EAF2FB', text: '#1E5BA8' },
  resolved:    { bg: '#DCFCE7', text: '#166534' },
  closed:      { bg: '#F4F4F5', text: '#52525B' },
  onboarding:  { bg: '#EAF2FB', text: '#1E5BA8' },
  inactive:    { bg: '#F4F4F5', text: '#71717A' },
  high:        { bg: '#FEE2E2', text: '#991B1B' },
  critical:    { bg: '#FEE2E2', text: '#991B1B' },
  medium:      { bg: '#FEF9C3', text: '#854D0E' },
  low:         { bg: '#F4F4F5', text: '#52525B' },
  solo:        { bg: '#EAF2FB', text: '#1E5BA8' },
  couple:      { bg: '#FCE7F3', text: '#9D174D' },
  family:      { bg: '#DCFCE7', text: '#166534' },
  friends:     { bg: '#FEF8E6', text: '#A16207' },
  approved:    { bg: '#DCFCE7', text: '#166534' },
  rejected:    { bg: '#FEE2E2', text: '#991B1B' },
  video:       { bg: '#EAF2FB', text: '#1E5BA8' },
  photo:       { bg: '#FEF8E6', text: '#A16207' },
  story:       { bg: '#F4F4F5', text: '#52525B' },
};

export const CHART = {
  brandBlue: '#2E78D2',
  brandBlueLight: '#7AB0E6',
  brandBlueDark: '#1E5BA8',
  brandGold: '#F5B731',
  ink: '#18181B',
  muted: '#A1A1AA',
  success: '#16A34A',
  warning: '#CA8A04',
  danger: '#DC2626',
  surface: '#F4F4F5',
};

// ─── Badge ────────────────────────────────────────────────────────────────
export function Badge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >{label}</span>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────
export function Section({
  title, action, children, className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-hairline overflow-hidden shadow-card ${className || ''}`}>
      {title && (
        <div className="flex justify-between items-center px-5 py-3 border-b border-hairline">
          <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────
export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-hairline">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4" style={{ width: i === 0 ? '70%' : `${40 + (i * 7) % 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────
export function Pagination({
  page, total, limit, onChange,
}: {
  page: number; total: number; limit: number; onChange: (p: number) => void;
}) {
  const maxPage = Math.max(0, Math.ceil(total / limit) - 1);
  const start = total === 0 ? 0 : page * limit + 1;
  const end = Math.min(total, (page + 1) * limit);
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-hairline bg-surface">
      <span className="text-xs text-muted">
        {total === 0 ? 'No results' : `${start.toLocaleString()}\u2013${end.toLocaleString()} of ${total.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-2.5 py-1 rounded-md border border-hairline text-xs font-medium text-body hover:border-brand-blue disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          aria-label="Previous page"
        ><ChevronLeft size={13} /> Prev</button>
        <span className="text-xs text-muted">Page {page + 1} of {maxPage + 1}</span>
        <button
          onClick={() => onChange(Math.min(maxPage, page + 1))}
          disabled={page >= maxPage}
          className="px-2.5 py-1 rounded-md border border-hairline text-xs font-medium text-body hover:border-brand-blue disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          aria-label="Next page"
        >Next <ChevronRight size={13} /></button>
      </div>
    </div>
  );
}

// ─── TH ───────────────────────────────────────────────────────────────────
export function TH({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">{children}</th>;
}

// ─── timeAgo ──────────────────────────────────────────────────────────────
export function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
