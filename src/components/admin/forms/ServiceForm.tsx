'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import { ServiceItem } from '@/types';
import { TextInput } from '@/components/admin/form/TextInput';
import { Textarea } from '@/components/admin/form/Textarea';
import { ChipsInput } from '@/components/admin/form/ChipsInput';
import { RepeatableField } from '@/components/admin/form/RepeatableField';
import { ImageInput } from '@/components/admin/form/ImageInput';
import { IconPicker } from '@/components/admin/form/IconPicker';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { useToast } from '@/components/admin/Toast';
import { slugify, uid } from '@/lib/utils';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { createDoc, updateDocById, type DbResult } from '@/lib/firestore/crud';
import { uploadImage } from '@/lib/firestore/storage';

export function getInitialService(): ServiceItem {
  return {
    id: uid(),
    slug: '',
    title: '',
    shortDescription: '',
    fullDescription: '',
    heroImage: '',
    icon: 'Leaf',
    gallery: [],
    features: [],
    pricingRange: '',
    benefits: [],
    process: [],
    faqs: [],
  };
}

export function ServiceForm({
  initial,
  isNew = false,
}: {
  initial: Partial<ServiceItem>;
  isNew?: boolean;
}) {
  const router = useRouter();
  const { pushSuccess, pushError } = useToast();
  const [form, setForm] = useState<ServiceItem>(() => {
    if (!initial.id) return getInitialService();
    return {
      ...getInitialService(),
      ...initial,
      benefits: initial.benefits ?? [],
      process: initial.process ?? [],
      faqs: initial.faqs ?? [],
      gallery: initial.gallery ?? [],
      features: initial.features ?? [],
    };
  });
  const [saving, setSaving] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ServiceItem>(key: K, value: ServiceItem[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: f.slug === slugify(f.title) ? slugify(title) : f.slug || slugify(title),
    }));
  };

  const uploadHero = async (file: File) => {
    setHeroUploading(true);
    const res = await uploadImage(file, 'admin/services');
    setHeroUploading(false);
    if (res.url) set('heroImage', res.url);
    else pushError('Upload failed', res.error ?? '');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      pushError('Title is required');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      process: form.process
        .map((p, i) => ({ ...p, step: i + 1 }))
        .filter((p) => p.title.trim() || p.desc.trim()),
    };

    // The document id and the `id` field must stay the same value, otherwise
    // every later edit/delete (which targets `id`) hits a missing document.
    let result: DbResult<{ id: string }>;
    if (isNew) {
      const docId = payload.slug || payload.id;
      if (!docId) {
        setSaving(false);
        pushError('Could not save service', 'The title does not produce a usable slug.');
        return;
      }
      result = await createDoc(COLLECTIONS.services, { ...payload, id: docId }, docId);
    } else if (initial.id) {
      result = await updateDocById(COLLECTIONS.services, initial.id, payload);
    } else {
      result = { data: null, error: 'Missing service id — open the service from the list to edit it.' };
    }
    setSaving(false);
    if (result.error) {
      pushError('Could not save service', result.error);
      return;
    }
    pushSuccess(isNew ? 'Service created' : 'Service updated', payload.title);
    router.push('/admin/services');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Basics</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Title" value={form.title} onChange={(e) => onTitleChange(e.target.value)} required />
          <TextInput
            label="Slug"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            hint="Used in the public service URL."
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Textarea
            label="Short description"
            rows={3}
            value={form.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
          />
          <Textarea
            label="Full description"
            rows={5}
            value={form.fullDescription}
            onChange={(e) => set('fullDescription', e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Media & icon</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#172b21]">Hero image</label>
            {form.heroImage ? (
              <div className="relative h-40 overflow-hidden rounded-xl border border-[#e5ece3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.heroImage} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => set('heroImage', '')}
                  className="absolute right-2 top-2 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-red-600 shadow"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => heroFileRef.current?.click()}
                disabled={heroUploading}
                className="flex h-40 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#cfe0cc] bg-white text-sm font-medium text-[#14402a] hover:bg-[#eaf0e7]"
              >
                {heroUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                {heroUploading ? 'Uploading…' : 'Upload hero image'}
              </button>
            )}
            <input
              ref={heroFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && uploadHero(e.target.files[0])}
            />
            <TextInput
              label="…or paste image URL"
              value={form.heroImage.startsWith('http') ? form.heroImage : ''}
              onChange={(e) => set('heroImage', e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div>
            <IconPicker label="Icon" value={form.icon} onChange={(icon) => set('icon', icon)} />
            <div className="mt-4">
              <TextInput
                label="Pricing range"
                value={form.pricingRange}
                onChange={(e) => set('pricingRange', e.target.value)}
                placeholder="e.g. PKR 15,000 – 50,000"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <ImageInput
            label="Gallery images"
            value={form.gallery}
            onChange={(gallery) => set('gallery', gallery)}
            folder="admin/services"
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Features</h3>
        <ChipsInput
          label="Feature bullets"
          value={form.features}
          onChange={(features) => set('features', features)}
          placeholder="Add a feature and press Enter"
        />
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Benefits</h3>
        <RepeatableField<ServiceItem['benefits'][number]>
          label="Benefit blocks"
          items={form.benefits}
          onChange={(benefits) => set('benefits', benefits)}
          onCreate={() => ({ title: '', desc: '' })}
          addLabel="Add benefit"
          renderItem={(item, update) => (
            <div className="grid gap-3 pr-9 sm:grid-cols-2">
              <TextInput label="Title" value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
              <Textarea label="Description" rows={2} value={item.desc} onChange={(e) => update({ ...item, desc: e.target.value })} />
            </div>
          )}
        />
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Process</h3>
        <RepeatableField<ServiceItem['process'][number]>
          label="Process steps (ordered)"
          items={form.process}
          onChange={(process) => set('process', process)}
          onCreate={() => ({ step: 0, title: '', desc: '' })}
          addLabel="Add step"
          renderItem={(item, update, index) => (
            <div className="grid gap-3 pr-9 sm:grid-cols-2">
              <TextInput
                label={`Step ${index + 1} title`}
                value={item.title}
                onChange={(e) => update({ ...item, title: e.target.value })}
              />
              <Textarea label="Description" rows={2} value={item.desc} onChange={(e) => update({ ...item, desc: e.target.value })} />
            </div>
          )}
        />
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">FAQs</h3>
        <RepeatableField<ServiceItem['faqs'][number]>
          items={form.faqs}
          onChange={(faqs) => set('faqs', faqs)}
          onCreate={() => ({ question: '', answer: '' })}
          addLabel="Add FAQ"
          renderItem={(item, update) => (
            <div className="grid gap-3 pr-9">
              <TextInput label="Question" value={item.question} onChange={(e) => update({ ...item, question: e.target.value })} />
              <Textarea label="Answer" rows={2} value={item.answer} onChange={(e) => update({ ...item, answer: e.target.value })} />
            </div>
          )}
        />
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {isNew ? 'Create service' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}