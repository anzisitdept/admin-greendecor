'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GalleryProject, ServiceItem } from '@/types';
import { TextInput } from '@/components/admin/form/TextInput';
import { Textarea } from '@/components/admin/form/Textarea';
import { NumberInput } from '@/components/admin/form/NumberInput';
import { Select } from '@/components/admin/form/Select';
import { Toggle } from '@/components/admin/form/Toggle';
import { ImageInput } from '@/components/admin/form/ImageInput';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { useToast } from '@/components/admin/Toast';
import { uid } from '@/lib/utils';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { createDoc, updateDocById } from '@/lib/firestore/crud';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { useGalleryCategories } from '@/lib/hooks/useGalleryCategories';

export function getInitialGalleryProject(): GalleryProject {
  return {
    id: uid(),
    title: '',
    category: '',
    serviceSlug: '',
    image: '',
    shortDetails: '',
    details: '',
    order: 0,
    active: true,
  };
}

export function GalleryProjectForm({
  initial,
  isNew = false,
}: {
  initial: Partial<GalleryProject>;
  isNew?: boolean;
}) {
  const router = useRouter();
  const { pushSuccess, pushError } = useToast();
  const { categories, loading: categoriesLoading } = useGalleryCategories();
  const { data: services } = useFirestoreCollection<ServiceItem>(COLLECTIONS.services);

  const [form, setForm] = useState<GalleryProject>(() => ({
    ...getInitialGalleryProject(),
    ...initial,
  }));
  const [saving, setSaving] = useState(false);

  const serviceOptions = useMemo(
    () => services.map((s) => ({ value: s.slug, label: s.title })),
    [services]
  );

  const set = <K extends keyof GalleryProject>(key: K, value: GalleryProject[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      pushError('Title is required');
      return;
    }
    if (!form.category) {
      pushError('Pick a category', 'Gallery projects must be filed under a category.');
      return;
    }
    setSaving(true);
    const payload: GalleryProject = {
      ...form,
      title: form.title.trim(),
      serviceSlug: form.serviceSlug?.trim() || undefined,
      shortDetails: form.shortDetails.trim(),
      details: form.details.trim(),
    };
    const result = isNew
      ? await createDoc(COLLECTIONS.galleryProjects, payload, payload.id)
      : initial.id
        ? await updateDocById(COLLECTIONS.galleryProjects, initial.id, payload)
        : { data: null, error: 'Missing project id — open the project from the list to edit it.' };
    setSaving(false);
    if (result.error) {
      pushError('Could not save project', result.error);
      return;
    }
    pushSuccess(isNew ? 'Project created' : 'Project updated', payload.title);
    router.push('/admin/gallery');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Project details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            hint="Shown as the card heading and in the popup."
            required
          />
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            hint="Drives the filter tab on the public gallery."
            required
          >
            <option value="">
              {categoriesLoading ? 'Loading categories…' : 'Select a category'}
            </option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Select
            label="Related service (optional)"
            value={form.serviceSlug ?? ''}
            onChange={(e) => set('serviceSlug', e.target.value)}
            hint="Links the project to one of your services."
          >
            <option value="">No related service</option>
            {serviceOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <NumberInput
            label="Sort order"
            value={form.order ?? 0}
            onChange={(e) => set('order', Number(e.target.value) || 0)}
            hint="Lower numbers appear first."
          />
        </div>
        <div className="mt-4 space-y-4">
          <Textarea
            label="Short details"
            rows={2}
            value={form.shortDetails}
            onChange={(e) => set('shortDetails', e.target.value)}
            hint="One or two lines — revealed on the gallery card."
          />
          <Textarea
            label="Full details (optional)"
            rows={4}
            value={form.details}
            onChange={(e) => set('details', e.target.value)}
            hint="Longer copy for the popup. Falls back to the short details."
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Image & visibility</h3>
        <ImageInput
          label="Project image"
          description="Upload the photo, or paste an image URL. The first image is used."
          folder="admin/gallery"
          value={form.image ? [form.image] : []}
          onChange={(next) => set('image', next[0] ?? '')}
        />
        <div className="mt-4">
          <Toggle
            label="Visible on the public gallery"
            description="Turn off to hide this project without deleting it."
            checked={form.active}
            onChange={(v) => set('active', v)}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {isNew ? 'Create project' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
