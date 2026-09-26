'use client';

import { useRef, useState } from 'react';
import { Save, Send, Loader2 } from 'lucide-react';
import { SiteContent, SiteContentDoc, HeroSlide, ServiceItem, TrustBarStat } from '@/types';
import { useFirestoreDoc, useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS, SITE_CONTENT_ID } from '@/lib/firestore/collections';
import { setDocById } from '@/lib/firestore/crud';
import { uploadImage } from '@/lib/firestore/storage';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { StatusPill } from '@/components/admin/StatusPill';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { TextInput } from '@/components/admin/form/TextInput';
import { Textarea } from '@/components/admin/form/Textarea';
import { RepeatableField } from '@/components/admin/form/RepeatableField';
import { IconPicker } from '@/components/admin/form/IconPicker';
import { useToast } from '@/components/admin/Toast';

const EMPTY: SiteContent = {
  heroSlides: [],
  purpose: {
    heading: '',
    subcopy: '',
    pillars: [],
    quote: '',
  },
  trustBar: {
    stats: [],
    note: '',
  },
  servicesGrid: {
    heading: '',
    subcopy: '',
    serviceIds: [],
  },
  footer: {
    about: '',
    hours: '',
    credits: '',
  },
};

export default function SiteContentPage() {
  const { data: doc, loading } = useFirestoreDoc<SiteContentDoc>(COLLECTIONS.siteContent, SITE_CONTENT_ID);
  const { data: services } = useFirestoreCollection<ServiceItem>(COLLECTIONS.services);
  const { pushSuccess, pushError } = useToast();

  const [form, setForm] = useState<SiteContent | null>(null);
  const current = form ?? (doc ? { ...EMPTY, ...(doc.content ?? {}) } : EMPTY);
  const published = doc?.published ?? false;
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const set = (next: SiteContent) => setForm(next);

  const setHeroSlides = (heroSlides: HeroSlide[]) => set({ ...current, heroSlides });

  const uploadHeroImage = async (index: number, file: File) => {
    const key = `hero-${index}`;
    setUploadingFor(key);
    const res = await uploadImage(file, 'admin/site-content');
    setUploadingFor(null);
    if (res.url) {
      const slides = [...current.heroSlides];
      slides[index] = { ...slides[index], image: res.url };
      setHeroSlides(slides);
    } else {
      pushError('Upload failed', res.error ?? '');
    }
  };

  const save = async (publish: boolean) => {
    setSaving(true);
    const payload = {
      content: current,
      published: publish,
      updatedAt: new Date().toISOString(),
    };
    const result = await setDocById(COLLECTIONS.siteContent, SITE_CONTENT_ID, payload);
    setSaving(false);
    if (result.error) {
      pushError(publish ? 'Could not publish' : 'Could not save draft', result.error);
      return;
    }
    pushSuccess(
      publish ? 'Content published' : 'Draft saved',
      publish ? 'Live on the public site now.' : 'Saved without publishing.'
    );
    setForm(null);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Site content" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Site content"
        subtitle="Edit page sections without redeploying."
        action={
          <>
            <Button variant="outline" onClick={() => save(false)} loading={saving}>
              <Save className="h-4 w-4" />
              Save draft
            </Button>
            <Button onClick={() => save(true)} loading={saving}>
              <Send className="h-4 w-4" />
              Publish
            </Button>
          </>
        }
      />

      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-[#172b21]">Home page content</p>
          <p className="text-xs text-[#52685a]">
            {published ? 'Currently published and live.' : 'Latest version is a draft.'}
          </p>
        </div>
        <StatusPill label={published ? 'Published' : 'Draft'} tone={published ? 'green' : 'amber'} dot />
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Hero slides</h3>
        <RepeatableField<HeroSlide>
          items={current.heroSlides}
          onChange={setHeroSlides}
          onCreate={() => ({ title: '', subtitle: '', image: '', wallScript: '', badge: '' })}
          addLabel="Add slide"
          renderItem={(slide, update, index) => (
            <div className="space-y-3 pr-9">
              <TextInput
                label="Title"
                value={slide.title}
                onChange={(e) => update({ ...slide, title: e.target.value })}
              />
              <Textarea
                label="Subtitle"
                rows={2}
                value={slide.subtitle}
                onChange={(e) => update({ ...slide, subtitle: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Wall script (decorative)"
                  value={slide.wallScript ?? ''}
                  onChange={(e) => update({ ...slide, wallScript: e.target.value })}
                />
                <TextInput
                  label="Badge"
                  value={slide.badge ?? ''}
                  onChange={(e) => update({ ...slide, badge: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <TextInput
                  label="Background image URL"
                  className="flex-1"
                  value={slide.image}
                  onChange={(e) => update({ ...slide, image: e.target.value })}
                  placeholder="https://â€¦"
                />
                <div className="flex items-end">
                  <input
                    ref={(el) => {
                      fileRefs.current[`hero-${index}`] = el;
                    }}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => e.target.files?.[0] && uploadHeroImage(index, e.target.files[0])}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileRefs.current[`hero-${index}`]?.click()}
                    disabled={uploadingFor === `hero-${index}`}
                  >
                    {uploadingFor === `hero-${index}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Upload'
                    )}
                  </Button>
                </div>
              </div>
              {slide.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.image} alt="" className="h-28 w-full rounded-xl object-cover" />
              ) : null}
            </div>
          )}
        />
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Purpose section</h3>
        <div className="space-y-4">
          <TextInput
            label="Heading"
            value={current.purpose.heading}
            onChange={(e) => set({ ...current, purpose: { ...current.purpose, heading: e.target.value } })}
          />
          <Textarea
            label="Sub-copy"
            rows={2}
            value={current.purpose.subcopy}
            onChange={(e) => set({ ...current, purpose: { ...current.purpose, subcopy: e.target.value } })}
          />
          <TextInput
            label="Quote"
            value={current.purpose.quote}
            onChange={(e) => set({ ...current, purpose: { ...current.purpose, quote: e.target.value } })}
          />
          <RepeatableField
            label="Pillars"
            items={current.purpose.pillars}
            onChange={(pillars) => set({ ...current, purpose: { ...current.purpose, pillars } })}
            onCreate={() => ({ label: '', icon: 'Leaf' })}
            addLabel="Add pillar"
            renderItem={(pillar, update) => (
              <div className="grid gap-3 pr-9 sm:grid-cols-2">
                <TextInput
                  label="Label"
                  value={pillar.label}
                  onChange={(e) => update({ ...pillar, label: e.target.value })}
                />
                <IconPicker
                  label="Icon"
                  value={pillar.icon}
                  onChange={(icon) => update({ ...pillar, icon })}
                />
              </div>
            )}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Trust bar</h3>
        <div className="space-y-4">
          <TextInput
            label="Note"
            value={current.trustBar.note}
            onChange={(e) => set({ ...current, trustBar: { ...current.trustBar, note: e.target.value } })}
          />
          <RepeatableField<TrustBarStat>
            label="Stats"
            items={current.trustBar.stats}
            onChange={(stats) => set({ ...current, trustBar: { ...current.trustBar, stats } })}
            onCreate={() => ({ number: '', label: '' })}
            addLabel="Add stat"
            renderItem={(stat, update) => (
              <div className="grid gap-3 pr-9 sm:grid-cols-2">
                <TextInput
                  label="Number"
                  value={stat.number}
                  onChange={(e) => update({ ...stat, number: e.target.value })}
                />
                <TextInput
                  label="Label"
                  value={stat.label}
                  onChange={(e) => update({ ...stat, label: e.target.value })}
                />
              </div>
            )}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Services grid</h3>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Heading"
              value={current.servicesGrid.heading}
              onChange={(e) =>
                set({ ...current, servicesGrid: { ...current.servicesGrid, heading: e.target.value } })
              }
            />
            <TextInput
              label="Sub-copy"
              value={current.servicesGrid.subcopy}
              onChange={(e) =>
                set({ ...current, servicesGrid: { ...current.servicesGrid, subcopy: e.target.value } })
              }
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-[#172b21]">Visible services</span>
            <div className="mt-1.5 space-y-1.5">
              {services.map((s) => {
                const checked = current.servicesGrid.serviceIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 rounded-xl border border-[#e5ece3] bg-white px-3 py-2.5 text-sm hover:bg-[#fafbfa]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const serviceIds = checked
                          ? current.servicesGrid.serviceIds.filter((id) => id !== s.id)
                          : [...current.servicesGrid.serviceIds, s.id];
                        set({ ...current, servicesGrid: { ...current.servicesGrid, serviceIds } });
                      }}
                      className="accent-[#14402a]"
                    />
                    <span className="font-medium text-[#172b21]">{s.title}</span>
                    <span className="ml-auto text-xs text-[#aabcb0]">/{s.slug}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Footer</h3>
        <div className="space-y-4">
          <Textarea
            label="About text"
            rows={3}
            value={current.footer.about}
            onChange={(e) => set({ ...current, footer: { ...current.footer, about: e.target.value } })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Hours"
              value={current.footer.hours}
              onChange={(e) => set({ ...current, footer: { ...current.footer, hours: e.target.value } })}
            />
            <TextInput
              label="Credits line"
              value={current.footer.credits}
              onChange={(e) => set({ ...current, footer: { ...current.footer, credits: e.target.value } })}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => save(false)} loading={saving}>
          <Save className="h-4 w-4" />
          Save draft
        </Button>
        <Button onClick={() => save(true)} loading={saving}>
          <Send className="h-4 w-4" />
          Publish
        </Button>
      </div>
    </div>
  );
}
