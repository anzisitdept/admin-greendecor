'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';
import { TextInput } from '@/components/admin/form/TextInput';
import { Textarea } from '@/components/admin/form/Textarea';
import { Select } from '@/components/admin/form/Select';
import { NumberInput } from '@/components/admin/form/NumberInput';
import { Toggle } from '@/components/admin/form/Toggle';
import { ChipsInput } from '@/components/admin/form/ChipsInput';
import { ImageInput } from '@/components/admin/form/ImageInput';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { useToast } from '@/components/admin/Toast';
import { slugify, uid } from '@/lib/utils';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { createDoc, updateDocById, type DbResult } from '@/lib/firestore/crud';
import { useShopCategories } from '@/lib/hooks/useShopCategories';

export function getInitialProduct(): Product {
  const id = uid();
  return {
    id,
    name: '',
    slug: '',
    category: 'other',
    categoryLabel: 'Other',
    price: 0,
    images: [],
    stock: 0,
    rating: 5,
    reviewCount: 0,
    shortDescription: '',
    description: '',
    careInstructions: {
      sunlight: '',
      water: '',
      difficulty: 'Easy',
      petFriendly: true,
      indoor: true,
    },
    details: {},
    tags: [],
    featured: false,
    isNew: true,
    inStock: true,
  };
}

export function ProductForm({
  initial,
  isNew = false,
}: {
  initial: Partial<Product>;
  isNew?: boolean;
}) {
  const router = useRouter();
  const { pushSuccess, pushError } = useToast();
  const { categories, labels, error: categoriesError } = useShopCategories();
  const [form, setForm] = useState<Product>(() => {
    if (!initial.id) return getInitialProduct();
    const base = getInitialProduct();
    return {
      ...base,
      ...initial,
      careInstructions: { ...base.careInstructions!, ...initial.careInstructions },
      details: { ...base.details, ...initial.details },
    } as Product;
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: f.slug === slugify(f.name) ? slugify(name) : f.slug || slugify(name),
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      pushError('Name is required');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      categoryLabel: labels[form.category] ?? form.categoryLabel,
      inStock: form.inStock || (form.stock > 0 ? true : form.inStock),
      rating: Math.min(5, Math.max(0, Number(form.rating) || 0)),
      reviewCount: Number(form.reviewCount) || 0,
      stock: Math.max(0, Number(form.stock) || 0),
      price: Math.max(0, Number(form.price) || 0),
    };

    // The document id and the `id` field must stay the same value, otherwise
    // every later edit/delete (which targets `id`) hits a missing document.
    let result: DbResult<{ id: string }>;
    if (isNew) {
      if (!payload.slug) {
        setSaving(false);
        pushError('Could not save product', 'The name does not produce a usable slug.');
        return;
      }
      result = await createDoc(COLLECTIONS.products, { ...payload, id: payload.slug }, payload.slug);
    } else if (initial.id) {
      result = await updateDocById(COLLECTIONS.products, initial.id, payload);
    } else {
      result = { data: null, error: 'Missing product id — open the product from the list to edit it.' };
    }
    setSaving(false);
    if (result.error) {
      pushError('Could not save product', result.error);
      return;
    }
    pushSuccess(isNew ? 'Product created' : 'Product updated', payload.name);
    router.push('/admin/products');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Basics</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Name"
            name="name"
            value={form.name}
            onChange={(e) => onNameChange(e.target.value)}
            required
          />
          <TextInput
            label="Slug"
            name="slug"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            hint="Auto-generated from name. Used in the public URL."
          />
          <Select
            label="Category"
            name="category"
            value={form.category}
            onChange={(e) => {
              const next = e.target.value as Product['category'];
              // Keep the stored label in step with the pick, so the override
              // field only has to be touched for a genuine custom name.
              setForm((f) => ({
                ...f,
                category: next,
                categoryLabel: labels[next] ?? f.categoryLabel,
              }));
            }}
            hint={
              categoriesError
                ? 'Could not load categories — showing the built-in list.'
                : undefined
            }
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
            {/* An existing product on a retired category must stay visible and
                editable, otherwise opening it would silently switch category. */}
            {form.category && !categories.some((c) => c.value === form.category) ? (
              <option value={form.category}>{form.category} (retired)</option>
            ) : null}
          </Select>
          <TextInput
            label="Category label (override)"
            value={form.categoryLabel}
            onChange={(e) => set('categoryLabel', e.target.value)}
            hint="Shown on product cards and category pages."
          />
          <NumberInput
            label="Price (PKR)"
            name="price"
            prefix="PKR"
            value={form.price || ''}
            onChange={(e) => set('price', Number(e.target.value))}
            required
          />
          <NumberInput
            label="Sale price (optional)"
            name="salePrice"
            prefix="PKR"
            value={form.salePrice ?? ''}
            onChange={(e) =>
              set('salePrice', e.target.value === '' ? undefined : Number(e.target.value))
            }
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Media</h3>
        <ImageInput
          label="Product images"
          value={form.images}
          onChange={(images) => set('images', images)}
          description="Upload files or paste external URLs. First image is the thumbnail."
          folder="admin/products"
        />
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Stock & ratings</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput
            label="Stock"
            name="stock"
            value={form.stock ?? 0}
            onChange={(e) => set('stock', Number(e.target.value))}
          />
          <NumberInput
            label="Rating (0–5)"
            name="rating"
            step={0.1}
            min={0}
            max={5}
            value={form.rating ?? 0}
            onChange={(e) => set('rating', Number(e.target.value))}
          />
          <NumberInput
            label="Review count"
            name="reviewCount"
            value={form.reviewCount ?? 0}
            onChange={(e) => set('reviewCount', Number(e.target.value))}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Toggle
            label="In stock"
            description="Available to purchase"
            checked={form.inStock}
            onChange={(v) => set('inStock', v)}
          />
          <Toggle
            label="Featured"
            description="Shown in featured carousel"
            checked={form.featured ?? false}
            onChange={(v) => set('featured', v)}
          />
          <Toggle
            label="New arrival"
            description="Badged as new"
            checked={form.isNew ?? false}
            onChange={(v) => set('isNew', v)}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Copy</h3>
        <div className="space-y-4">
          <Textarea
            label="Short description"
            name="shortDescription"
            rows={2}
            value={form.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
          />
          <Textarea
            label="Full description"
            name="description"
            rows={5}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
          <ChipsInput
            label="Tags"
            value={form.tags}
            onChange={(tags) => set('tags', tags)}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Care instructions</h3>
        <div className="space-y-4">
          <TextInput
            label="Sunlight"
            value={form.careInstructions?.sunlight ?? ''}
            onChange={(e) =>
              set('careInstructions', { ...form.careInstructions!, sunlight: e.target.value })
            }
          />
          <TextInput
            label="Watering"
            value={form.careInstructions?.water ?? ''}
            onChange={(e) =>
              set('careInstructions', { ...form.careInstructions!, water: e.target.value })
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Difficulty"
              name="difficulty"
              value={form.careInstructions?.difficulty ?? 'Easy'}
              onChange={(e) =>
                set('careInstructions', {
                  ...form.careInstructions!,
                  difficulty: e.target.value as 'Easy' | 'Moderate' | 'Expert',
                })
              }
            >
              <option>Easy</option>
              <option>Moderate</option>
              <option>Expert</option>
            </Select>
            <div className="pt-6">
              <Toggle
                label="Pet friendly"
                checked={form.careInstructions?.petFriendly ?? true}
                onChange={(v) => set('careInstructions', { ...form.careInstructions!, petFriendly: v })}
              />
            </div>
            <div className="pt-6">
              <Toggle
                label="Indoor suitable"
                checked={form.careInstructions?.indoor ?? true}
                onChange={(v) => set('careInstructions', { ...form.careInstructions!, indoor: v })}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Height"
            value={form.details?.height ?? ''}
            onChange={(e) => set('details', { ...form.details!, height: e.target.value })}
          />
          <TextInput
            label="Pot size"
            value={form.details?.potSize ?? ''}
            onChange={(e) => set('details', { ...form.details!, potSize: e.target.value })}
          />
          <TextInput
            label="Material"
            value={form.details?.material ?? ''}
            onChange={(e) => set('details', { ...form.details!, material: e.target.value })}
          />
          <TextInput
            label="Origin"
            value={form.details?.origin ?? ''}
            onChange={(e) => set('details', { ...form.details!, origin: e.target.value })}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {isNew ? 'Create product' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}