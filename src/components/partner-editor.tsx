'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

type PartnerRow = {
  id: string;
  name: string;
  partner_type: string;
  tier: string;
  status: string;
  island_name: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  description?: string | null;
  is_featured?: boolean;
  is_sponsored?: boolean;
};

const blank = (partner: PartnerRow) => ({
  id: partner.id,
  name: partner.name || '',
  partner_type: partner.partner_type || 'vendor',
  tier: partner.tier || 'standard',
  status: partner.status || 'prospect',
  island_name: partner.island_name || '',
  contact_name: partner.contact_name || '',
  contact_email: partner.contact_email || '',
  contact_phone: partner.contact_phone || '',
  website: partner.website || '',
  description: partner.description || '',
  is_featured: Boolean(partner.is_featured),
  is_sponsored: Boolean(partner.is_sponsored),
});

export function PartnerEditor({ partner, onClose, onSaved }: { partner: PartnerRow; onClose: () => void; onSaved: () => Promise<void> | void }) {
  const [form, setForm] = useState(blank(partner));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return alert('Partner name is required');
    setSaving(true);
    try {
      const res = await apiFetch('/api/partners', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Update failed: ${res.status}`);
      await onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-hairline baha-gradient-card flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-brand-blue mb-1">Partner editor</div>
          <h3 className="text-lg font-display font-bold text-ink tracking-tight">{partner.name}</h3>
          <p className="text-xs text-body mt-1">Update partner status, tier, contacts, and placement flags.</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-white/70" title="Close editor"><X size={17} /></button>
      </div>

      <div className="p-5 grid grid-cols-4 gap-3">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Partner name" className="border border-hairline rounded-lg px-3 py-2 text-sm" />
        <select value={form.partner_type} onChange={e => setForm({ ...form, partner_type: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
          <option value="vendor">Vendor</option><option value="hotel">Hotel</option><option value="restaurant">Restaurant</option><option value="tour_operator">Tour Operator</option><option value="transportation">Transportation</option><option value="guide">Guide</option><option value="attraction">Attraction</option><option value="visa_service">Visa Service</option><option value="sponsor">Sponsor</option>
        </select>
        <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
          <option value="free">Free</option><option value="standard">Standard</option><option value="featured">Featured</option><option value="premium">Premium</option><option value="sponsor">Sponsor</option>
        </select>
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
          <option value="prospect">Prospect</option><option value="active">Active</option><option value="paused">Paused</option><option value="churned">Churned</option><option value="archived">Archived</option>
        </select>
        <input value={form.island_name} onChange={e => setForm({ ...form, island_name: e.target.value })} placeholder="Island" className="border border-hairline rounded-lg px-3 py-2 text-sm" />
        <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Contact name" className="border border-hairline rounded-lg px-3 py-2 text-sm" />
        <input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="Contact email" className="border border-hairline rounded-lg px-3 py-2 text-sm" />
        <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="Contact phone" className="border border-hairline rounded-lg px-3 py-2 text-sm" />
        <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="Website" className="border border-hairline rounded-lg px-3 py-2 text-sm col-span-2" />
        <label className="flex items-center gap-2 text-sm text-body border border-hairline rounded-lg px-3 py-2"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} /> Featured</label>
        <label className="flex items-center gap-2 text-sm text-body border border-hairline rounded-lg px-3 py-2"><input type="checkbox" checked={form.is_sponsored} onChange={e => setForm({ ...form, is_sponsored: e.target.checked })} /> Sponsored</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description / internal partner notes" className="border border-hairline rounded-lg px-3 py-2 text-sm col-span-4 min-h-20" />
      </div>

      <div className="px-5 pb-5 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-hairline text-sm font-semibold text-body hover:bg-surface">Cancel</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60 inline-flex items-center gap-1.5"><Save size={14} /> {saving ? 'Saving…' : 'Save Partner'}</button>
      </div>
    </div>
  );
}
