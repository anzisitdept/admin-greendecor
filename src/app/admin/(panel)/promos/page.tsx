'use client';

import { useRef, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Megaphone, Loader2 } from 'lucide-react';
import { PromoSlide } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { createDoc, deleteDocById, updateDocById } from '@/lib/firestore/crud';
import { uid } from '@/lib/utils';
import { uploadImage } from '@/lib/firestore/storage';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { ConfirmModal, Modal } from '@/components/admin/Modal';
import { TextInput } from '@/components/admin/form/TextInput';
import { Textarea } from '@/components/admin/form/Textarea';
import { Toggle } from '@/components/admin/form/Toggle';
import { useToast } from '@/components/admin/Toast';
import { cn } from '@/lib/utils';

export const GRADIENT_PRESETS: { name: string; value: string }[] = [
  { name: 'Forest', value: 'bg-gradient-to-r from-[#14402a] to-[#246d47]' },
  { name: 'Deep Green', value: 'bg-gradient-to-r from-[#0d2b1c] to-[#14402a]' },
  { name: 'Moss', value: 'bg-gradient-to-r from-[#3a6b4a] to-[#1e5c3c]' },
  { name: 'Olive', value: 'bg-gradient-to-r from-[#556b2f] to-[#2e4a22]' },
  { name: 'Terracotta', value: 'bg-gradient-to-r from-[#d47343] to-[#8a4a2b]' },
  { name: 'Charcoal', value: 'bg-gradient-to-br from-[#172b21] to-[#52685a]' },
];

function emptyPromo(order: number): PromoSlide {
  return {
    id: uid(),
    kicker: '',
    title: '',
    subtitle: '',
    ctaLabel: '',
    ctaHref: '',
    badge: '',
    bgGradient: GRADIENT_PRESETS[0].value,
    imageUrl: '',
    active: true,
    order,
  };
}

export default function PromosPage() {
  const { data: promos, loading } = useFirestoreCollection<PromoSlide>(COLLECTIONS.promos);
  const { pushSuccess, pushError } = useToast();

  const [editing, setEditing] = useState<PromoSlide | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoSlide | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...promos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const openNew = () => {
    setIsNew(true);
    setEditing(emptyPromo(sorted.length));
  };

  const openEdit = (p: PromoSlide) => {
    setIsNew(false);
    setEditing({ ...p });
  };

  const close = () => {
    setEditing(null);
    setIsNew(false);
  };

  const set = <K extends keyof PromoSlide>(key: K, value: PromoSlide[K]) =>
    setEditing((e) => (e ? { ...e, [key]: value } : e));

  const upload = async (file: File) => {
    setUploading(true);
    const res = await uploadImage(file, 'admin/promos');
    setUploading(false);
    if (res.url) set('imageUrl', res.url);
    else pushError('Upload failed', res.error ?? '');
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = { ...editing, title: editing.title.trim() };
    const result = isNew
      ? await createDoc(COLLECTIONS.promos, payload, payload.id)
      : await updateDocById(COLLECTIONS.promos, editing.id, payload);
    setSaving(false);
    if (result.error) {
      pushError('Could not save promo', result.error);
      return;
    }
    pushSuccess(isNew ? 'Promo created' : 'Promo updated', payload.title);
    close();
  };

  const swapOrder = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[target];
    const results = await Promise.all([
      updateDocById(COLLECTIONS.promos, a.id, { order: b.order }),
      updateDocById(COLLECTIONS.promos, b.id, { order: a.order }),
    ]);
    if (results.some((r) => r.error)) pushError('Could not reorder promos');
  };

  const toggleActive = async (p: PromoSlide) => {
    const result = await updateDocById(COLLECTIONS.promos, p.id, { active: !p.active });
    if (result.error) pushError('Could not update promo', result.error);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDocById(COLLECTIONS.promos, deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) pushError('Could not delete promo', result.error);
    else pushSuccess('Promo deleted', deleteTarget.title);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Promos & banners"
        subtitle={`${promos.length} slides · controls the home page carousel`}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            New promo
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton columns={3} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No promos yet"
          message="Add banner slides to display in the home page carousel."
          icon={<Megaphone className="h-6 w-6" />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((p, index) => (
            <Card key={p.id} className="overflow-hidden">
              {/* Live preview */}
              <div className={cn('relative flex min-h-[220px] items-center overflow-hidden rounded-2xl p-7 text-white', p.bgGradient)}>
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                ) : null}
                <div className="relative">
                  {p.badge ? (
                    <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                      {p.badge}
                    </span>
                  ) : null}
                  <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-white/70">{p.kicker}</p>
                  <h3 className="mt-1 font-serif text-2xl">{p.title}</h3>
                  {p.subtitle ? <p className="mt-1 max-w-sm text-sm text-white/80">{p.subtitle}</p> : null}
                  {p.ctaLabel ? (
                    <span className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#14402a]">
                      {p.ctaLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 px-2 py-3">
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  className="rounded-lg p-1.5 text-[#52685a] hover:bg-[#f4f7f2]"
                  title={p.active ? 'Deactivate' : 'Activate'}
                >
                  <StatusPill label={p.active ? 'Active' : 'Inactive'} tone={p.active ? 'green' : 'gray'} dot />
                </button>
                <span className="text-xs text-[#aabcb0]">#{p.order ?? index + 1}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => swapOrder(index, -1)}
                    className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7] disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === sorted.length - 1}
                    onClick={() => swapOrder(index, 1)}
                    className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7] disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="rounded-lg p-2 text-[#52685a] hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={close}
        title={isNew ? 'New promo' : 'Edit promo'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {isNew ? 'Create' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Kicker" value={editing?.kicker ?? ''} onChange={(e) => set('kicker', e.target.value)} />
            <TextInput label="Badge" value={editing?.badge ?? ''} onChange={(e) => set('badge', e.target.value)} />
          </div>
          <TextInput label="Title" value={editing?.title ?? ''} onChange={(e) => set('title', e.target.value)} required />
          <Textarea
            label="Subtitle"
            rows={2}
            value={editing?.subtitle ?? ''}
            onChange={(e) => set('subtitle', e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="CTA label"
              value={editing?.ctaLabel ?? ''}
              onChange={(e) => set('ctaLabel', e.target.value)}
            />
            <TextInput
              label="CTA link"
              value={editing?.ctaHref ?? ''}
              onChange={(e) => set('ctaHref', e.target.value)}
              placeholder="/shop"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-[#172b21]">Background gradient</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => set('bgGradient', g.value)}
                  title={g.name}
                  className={cn(
                    'h-10 flex-1 min-w-[90px] rounded-xl border-2 transition-all',
                    g.value,
                    editing?.bgGradient === g.value ? 'border-[#14402a] ring-2 ring-[#14402a]/20' : 'border-transparent'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-[#172b21]">Background image</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="h-10 rounded-xl border border-dashed border-[#cfe0cc] bg-white px-3 text-sm font-medium text-[#14402a] hover:bg-[#eaf0e7] disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : null}
                  Upload
                </button>
                <TextInput
                  value={editing?.imageUrl ?? ''}
                  onChange={(e) => set('imageUrl', e.target.value)}
                  placeholder="https://…"
                  className="!flex-1"
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
            </div>
            <div className="flex items-end">
              <Toggle
                label="Active"
                description="Shown in the carousel"
                checked={editing?.active ?? true}
                onChange={(v) => set('active', v)}
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete promo"
        message="Are you sure you want to delete this banner?"
      />
    </div>
  );
}