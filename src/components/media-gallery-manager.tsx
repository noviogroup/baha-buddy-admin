'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, ChevronDown, ChevronUp, GripVertical, Image as ImageIcon,
  Loader2, Plus, Star, Trash2, Upload, X, AlertCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type GalleryImage = {
  url: string;
  alt: string;
  type: GalleryImageType;
  is_primary: boolean;
  order: number;
};

export type GalleryImageType = 'hero' | 'gallery' | 'room' | 'food' | 'exterior' | 'activity' | 'map';

type PartnerSubmission = {
  id: string;
  place_id: string;
  url: string;
  alt: string;
  type: string;
  status: string;
  submitted_at: string;
  partners?: { name: string } | null;
};

const IMAGE_TYPES: { value: GalleryImageType; label: string }[] = [
  { value: 'hero', label: 'Hero' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'room', label: 'Room' },
  { value: 'food', label: 'Food' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'activity', label: 'Activity' },
  { value: 'map', label: 'Map' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeImages(raw: unknown): GalleryImage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i): GalleryImage => {
    if (typeof item === 'string') {
      return { url: item, alt: '', type: 'gallery', is_primary: i === 0, order: i };
    }
    return {
      url: (item as any).url || '',
      alt: (item as any).alt || '',
      type: (item as any).type || 'gallery',
      is_primary: !!(item as any).is_primary,
      order: typeof (item as any).order === 'number' ? (item as any).order : i,
    };
  }).filter(img => img.url);
}

function reorder(arr: GalleryImage[], fromIdx: number, toIdx: number): GalleryImage[] {
  const next = [...arr];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next.map((img, i) => ({ ...img, order: i }));
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  placeId: string;
  images: unknown[];
  onChange: (images: GalleryImage[]) => void;
  showPartnerApprovals?: boolean;
};

export function MediaGalleryManager({ placeId, images: rawImages, onChange, showPartnerApprovals = false }: Props) {
  const [gallery, setGallery] = useState<GalleryImage[]>(() => normalizeImages(rawImages));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<PartnerSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGallery(normalizeImages(rawImages));
  }, [rawImages]);

  const emit = useCallback((next: GalleryImage[]) => {
    setGallery(next);
    onChange(next);
  }, [onChange]);

  // ─── Upload ───────────────────────────────────────────────────────────────

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    setUploadError(null);

    const results: GalleryImage[] = [];
    for (const file of arr) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('placeId', placeId);
        const res = await apiFetch('/api/places/gallery-upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Upload failed for ${file.name}`);
        results.push({ url: json.url, alt: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '), type: 'gallery', is_primary: false, order: 0 });
      } catch (err: any) {
        setUploadError(err.message);
        break;
      }
    }

    if (results.length) {
      const next = [...gallery, ...results].map((img, i) => ({ ...img, order: i }));
      if (!next.some(img => img.is_primary) && next.length > 0) next[0].is_primary = true;
      emit(next);
    }
    setUploading(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = '';
  };

  const onDropZone = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) uploadFiles(files);
  };

  // ─── Reorder via drag ────────────────────────────────────────────────────

  const onDragStart = (idx: number) => setDragFrom(idx);
  const onDragEnter = (idx: number) => setDragOver(idx);
  const onDragEnd = () => {
    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
      emit(reorder(gallery, dragFrom, dragOver));
    }
    setDragFrom(null);
    setDragOver(null);
  };

  // ─── Image actions ───────────────────────────────────────────────────────

  const setPrimary = (idx: number) => {
    emit(gallery.map((img, i) => ({ ...img, is_primary: i === idx })));
  };

  const remove = (idx: number) => {
    const next = gallery.filter((_, i) => i !== idx).map((img, i) => ({ ...img, order: i }));
    if (next.length > 0 && !next.some(img => img.is_primary)) next[0].is_primary = true;
    if (expandedIdx === idx) setExpandedIdx(null);
    emit(next);
  };

  const updateField = (idx: number, field: keyof GalleryImage, value: string | boolean | number) => {
    emit(gallery.map((img, i) => i === idx ? { ...img, [field]: value } : img));
  };

  // ─── Partner approvals ───────────────────────────────────────────────────

  const loadSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const res = await apiFetch(`/api/partner-photos?placeId=${placeId}&status=pending`);
      const json = await res.json();
      setSubmissions(json.submissions || []);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    if (showPartnerApprovals && placeId) loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPartnerApprovals, placeId]);

  const reviewSubmission = async (id: string, action: 'approve' | 'reject') => {
    setReviewingId(id);
    try {
      const res = await apiFetch('/api/partner-photos', {
        method: 'PATCH',
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadSubmissions();
      if (action === 'approve') {
        const res2 = await apiFetch(`/api/places?limit=1&q=${placeId}`);
        const json2 = await res2.json();
        const updatedPlace = (json2.places || [])[0];
        if (updatedPlace?.gallery_images) emit(normalizeImages(updatedPlace.gallery_images));
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setReviewingId(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const primaryUrl = gallery.find(img => img.is_primary)?.url;

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDropZone}
        className="rounded-xl border-2 border-dashed border-hairline hover:border-brand-blue/50 bg-surface/40 px-4 py-6 flex flex-col items-center gap-3 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 size={22} className="text-brand-blue animate-spin" />
        ) : (
          <Upload size={22} className="text-muted" />
        )}
        <div className="text-center">
          <p className="text-sm font-semibold text-body">{uploading ? 'Uploading…' : 'Drag & drop images here, or click to browse'}</p>
          <p className="text-xs text-muted mt-1">JPEG, PNG, WebP, GIF · max 10MB each · multiple allowed</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto shrink-0"><X size={13} /></button>
        </div>
      )}

      {/* Gallery grid */}
      {gallery.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">{gallery.length} image{gallery.length !== 1 ? 's' : ''}</span>
            <span className="text-[11px] text-muted">Drag to reorder · ★ to set primary</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {gallery.map((img, idx) => (
              <div
                key={`${img.url}-${idx}`}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragEnter={() => onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={e => e.preventDefault()}
                className={`rounded-xl border overflow-hidden bg-white transition-all ${
                  dragOver === idx && dragFrom !== idx ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-hairline'
                } ${img.is_primary ? 'ring-2 ring-brand-gold/60' : ''}`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt || 'Gallery image'}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                  />
                  {/* Overlay controls */}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-start justify-between p-1.5 opacity-0 hover:opacity-100 group">
                    <button
                      onClick={e => { e.stopPropagation(); onDragStart(idx); }}
                      className="p-1 rounded bg-black/50 text-white cursor-grab active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      <GripVertical size={14} />
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => setPrimary(idx)} title="Set as primary" className={`p-1 rounded ${img.is_primary ? 'bg-brand-gold text-white' : 'bg-black/50 text-white hover:bg-brand-gold'}`}>
                        <Star size={13} fill={img.is_primary ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => remove(idx)} title="Remove" className="p-1 rounded bg-black/50 text-white hover:bg-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {img.is_primary && (
                    <div className="absolute bottom-1 left-1 rounded-full bg-brand-gold text-white text-[10px] px-1.5 py-0.5 font-bold flex items-center gap-1">
                      <Star size={9} fill="currentColor" /> Primary
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 rounded-full bg-black/50 text-white text-[10px] px-1.5 py-0.5 font-bold">
                    #{idx + 1}
                  </div>
                </div>

                {/* Metadata row */}
                <div className="px-2 py-1.5 flex items-center gap-1.5">
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className="flex-1 text-left text-xs text-body truncate hover:text-ink"
                    title="Edit metadata"
                  >
                    {img.alt || <span className="text-muted italic">Add alt text…</span>}
                  </button>
                  <span className="shrink-0 text-[10px] bg-surface text-muted px-1.5 py-0.5 rounded-md font-medium">{img.type}</span>
                  <button onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)} className="text-muted hover:text-ink">
                    {expandedIdx === idx ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* Expanded edit panel */}
                {expandedIdx === idx && (
                  <div className="border-t border-hairline px-2 pb-2 pt-2 space-y-2 bg-surface/40">
                    <div>
                      <label className="text-[11px] font-semibold text-muted block mb-1">Alt text</label>
                      <input
                        value={img.alt}
                        onChange={e => updateField(idx, 'alt', e.target.value)}
                        className="w-full border border-hairline rounded-md px-2 py-1 text-xs"
                        placeholder="Describe the image…"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted block mb-1">Image type</label>
                      <select
                        value={img.type}
                        onChange={e => updateField(idx, 'type', e.target.value as GalleryImageType)}
                        className="w-full border border-hairline rounded-md px-2 py-1 text-xs bg-white"
                      >
                        {IMAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
                      <input type="checkbox" checked={img.is_primary} onChange={e => { if (e.target.checked) setPrimary(idx); }} />
                      Set as primary image
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {gallery.length === 0 && !uploading && (
        <div className="flex flex-col items-center gap-2 py-4 text-muted">
          <ImageIcon size={28} className="opacity-30" />
          <p className="text-xs">No gallery images yet. Upload some above.</p>
        </div>
      )}

      {/* Primary image summary */}
      {primaryUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface/40 px-3 py-2">
          <div className="w-10 h-7 rounded overflow-hidden border border-hairline shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primaryUrl} alt="Primary" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs text-body">Primary image set · will be saved to <code className="text-[11px] bg-white rounded px-1 border border-hairline">primary_image_url</code></span>
          <CheckCircle2 size={14} className="text-status-success ml-auto shrink-0" />
        </div>
      )}

      {/* Partner photo approvals */}
      {showPartnerApprovals && (
        <div className="rounded-xl border border-hairline overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-surface/40">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Partner Photo Submissions</span>
            <button onClick={loadSubmissions} disabled={submissionsLoading} className="text-xs text-brand-blue hover:underline disabled:opacity-50">
              {submissionsLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {submissions.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted">No pending partner submissions.</div>
          ) : (
            <div className="divide-y divide-hairline">
              {submissions.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-14 h-10 rounded overflow-hidden border border-hairline shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sub.url} alt={sub.alt} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{sub.alt || 'No alt text'}</p>
                    <p className="text-[11px] text-muted">{sub.partners?.name || 'Unknown partner'} · {sub.type} · {new Date(sub.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => reviewSubmission(sub.id, 'approve')}
                      disabled={reviewingId === sub.id}
                      className="px-2.5 py-1 rounded-md bg-status-success text-white text-[11px] font-semibold hover:opacity-80 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reviewSubmission(sub.id, 'reject')}
                      disabled={reviewingId === sub.id}
                      className="px-2.5 py-1 rounded-md bg-status-danger text-white text-[11px] font-semibold hover:opacity-80 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
