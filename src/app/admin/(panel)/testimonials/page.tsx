'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Star, MessageSquareQuote } from 'lucide-react';
import { Testimonial } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { createDoc, deleteDocById, updateDocById } from '@/lib/firestore/crud';
import { uid } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { ConfirmModal, Modal } from '@/components/admin/Modal';
import { TextInput } from '@/components/admin/form/TextInput';
import { Textarea } from '@/components/admin/form/Textarea';
import { NumberInput } from '@/components/admin/form/NumberInput';
import { Toggle } from '@/components/admin/form/Toggle';
import { ImageInput } from '@/components/admin/form/ImageInput';
import { useToast } from '@/components/admin/Toast';

function emptyTestimonial(): Testimonial {
  return {
    id: uid(),
    name: '',
    role: '',
    city: '',
    quote: '',
    rating: 5,
    photoUrl: '',
    image: '',
    serviceOrProduct: '',
    featured: false,
    approved: true,
  };
}

export default function TestimonialsPage() {
  const { data: testimonials, loading } = useFirestoreCollection<Testimonial>(
    COLLECTIONS.testimonials
  );
  const { pushSuccess, pushError } = useToast();

  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openNew = () => {
    setIsNew(true);
    setEditing(emptyTestimonial());
  };

  const openEdit = (t: Testimonial) => {
    setIsNew(false);
    setEditing({ ...t });
  };

  const close = () => {
    setEditing(null);
    setIsNew(false);
  };

  const set = <K extends keyof Testimonial>(key: K, value: Testimonial[K]) =>
    setEditing((e) => (e ? { ...e, [key]: value } : e));

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = { ...editing, name: editing.name.trim() };
    const result = isNew
      ? await createDoc(COLLECTIONS.testimonials, payload, payload.id)
      : await updateDocById(COLLECTIONS.testimonials, editing.id, payload);
    setSaving(false);
    if (result.error) {
      pushError('Could not save testimonial', result.error);
      return;
    }
    pushSuccess(isNew ? 'Testimonial created' : 'Testimonial updated', payload.name);
    close();
  };

  const toggleField = async (t: Testimonial, field: 'featured' | 'approved') => {
    const result = await updateDocById(COLLECTIONS.testimonials, t.id, { [field]: !t[field] });
    if (result.error) pushError('Could not update testimonial', result.error);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDocById(COLLECTIONS.testimonials, deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) pushError('Could not delete testimonial', result.error);
    else pushSuccess('Testimonial deleted', deleteTarget.name);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Testimonials"
        subtitle={`${testimonials.length} testimonials · ${testimonials.filter((t) => t.approved).length} published`}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            New testimonial
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton columns={5} />
      ) : testimonials.length === 0 ? (
        <EmptyState
          title="No testimonials yet"
          message="Add customer quotes to build social proof on the store."
          icon={<MessageSquareQuote className="h-6 w-6" />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {t.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf0e7] font-bold text-[#14402a]">
                      {t.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-[#172b21]">{t.name}</p>
                    <p className="text-xs text-[#52685a]">
                      {[t.role, t.city].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={
                        i < (t.rating ?? 0)
                          ? 'h-3.5 w-3.5 fill-[#d47343] text-[#d47343]'
                          : 'h-3.5 w-3.5 text-[#d4e0d2]'
                      }
                    />
                  ))}
                </div>
              </div>

              <p className="mt-3 flex-1 text-sm italic text-[#52685a]">“{t.quote}”</p>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e5ece3] pt-3">
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      ...t,
                      featured: !t.featured,
                    })
                  }
                  className="rounded-lg p-1.5 text-[#52685a] hover:bg-[#f4f7f2]"
                  title={t.featured ? 'Unfeature' : 'Feature'}
                >
                  <Star className={`h-4 w-4 ${t.featured ? 'fill-[#d47343] text-[#d47343]' : ''}`} />
                </button>
                {t.image ? (
                  <span
                    className="flex items-center gap-1.5 rounded-lg bg-[#eaf0e7] px-1.5 py-1 text-[11px] font-semibold text-[#14402a]"
                    title="Has photo — renders as split card"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.image} alt="" className="h-5 w-5 rounded object-cover" />
                    Photo
                  </span>
                ) : null}
                <StatusPill
                  label={t.approved ? 'Published' : 'Pending'}
                  tone={t.approved ? 'green' : 'amber'}
                  dot
                />
                <button
                  type="button"
                  onClick={() => toggleField(t, 'approved')}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-[#14402a] hover:bg-[#eaf0e7]"
                >
                  {t.approved ? 'Unpublish' : 'Approve'}
                </button>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(t)}
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
        title={isNew ? 'New testimonial' : 'Edit testimonial'}
        description="Featured testimonials appear prominently on the home page."
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
            <TextInput label="Name" value={editing?.name ?? ''} onChange={(e) => set('name', e.target.value)} required />
            <TextInput label="Role / title" value={editing?.role ?? ''} onChange={(e) => set('role', e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="City" value={editing?.city ?? ''} onChange={(e) => set('city', e.target.value)} />
            <TextInput
              label="Service / product"
              value={editing?.serviceOrProduct ?? ''}
              onChange={(e) => set('serviceOrProduct', e.target.value)}
            />
          </div>
          <TextInput
            label="Photo URL"
            value={editing?.photoUrl ?? ''}
            onChange={(e) => set('photoUrl', e.target.value)}
            placeholder="https://…"
          />
          <ImageInput
            label="Review photo (split card image)"
            description="Optional. When set, this testimonial renders as a photo split-card on the home page and testimonials page."
            folder="admin/testimonials"
            value={editing?.image ? [editing.image] : []}
            onChange={(next) => set('image', next[0] ?? '')}
          />
          <Textarea
            label="Quote"
            rows={3}
            value={editing?.quote ?? ''}
            onChange={(e) => set('quote', e.target.value)}
            required
          />
          <NumberInput
            label="Rating (1–5)"
            min={1}
            max={5}
            step={0.5}
            value={editing?.rating ?? 5}
            onChange={(e) => set('rating', Number(e.target.value))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle
              label="Featured"
              checked={editing?.featured ?? false}
              onChange={(v) => set('featured', v)}
            />
            <Toggle
              label="Approved / published"
              checked={editing?.approved ?? true}
              onChange={(v) => set('approved', v)}
            />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete testimonial"
        message="Are you sure you want to delete this testimonial?"
      />
    </div>
  );
}