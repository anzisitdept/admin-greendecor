'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { GalleryCategory } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { deleteDocById, setDocById } from '@/lib/firestore/crud';
import { slugify } from '@/lib/utils';
import { DEFAULT_GALLERY_CATEGORIES } from '@/lib/data/galleryCategories';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { StatusPill } from '@/components/admin/StatusPill';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { ConfirmModal, Modal } from '@/components/admin/Modal';
import { TextInput } from '@/components/admin/form/TextInput';
import { NumberInput } from '@/components/admin/form/NumberInput';
import { Toggle } from '@/components/admin/form/Toggle';
import { useToast } from '@/components/admin/Toast';

export default function GalleryCategoriesPage() {
  const { data: categories, loading } = useFirestoreCollection<GalleryCategory>(
    COLLECTIONS.galleryCategories,
    { orderByField: 'order', orderDirection: 'asc' }
  );
  const { pushSuccess, pushError } = useToast();

  const [label, setLabel] = useState('');
  const [order, setOrder] = useState(1);
  const [savingNew, setSavingNew] = useState(false);

  const [editing, setEditing] = useState<GalleryCategory | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editOrder, setEditOrder] = useState(1);
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<GalleryCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const addCategory = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      pushError('Label is required');
      return;
    }
    const id = slugify(trimmed);
    if (!id) {
      pushError('That label has no usable characters');
      return;
    }
    if (categories.some((c) => c.id === id)) {
      pushError('Category already exists', `The slug "${id}" is taken.`);
      return;
    }
    setSavingNew(true);
    const result = await setDocById(COLLECTIONS.galleryCategories, id, {
      id,
      label: trimmed,
      order: Number(order) || 1,
      active: true,
    });
    setSavingNew(false);
    if (result.error) {
      pushError('Could not add category', result.error);
      return;
    }
    pushSuccess('Category added', trimmed);
    setLabel('');
    setOrder(categories.length + 1);
  };

  const openEdit = (category: GalleryCategory) => {
    setEditing(category);
    setEditLabel(category.label);
    setEditOrder(category.order ?? 1);
    setEditActive(category.active !== false);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const trimmed = editLabel.trim();
    if (!trimmed) {
      pushError('Label is required');
      return;
    }
    setSavingEdit(true);
    const result = await setDocById(COLLECTIONS.galleryCategories, editing.id, {
      id: editing.id,
      label: trimmed,
      order: Number(editOrder) || 1,
      active: editActive,
    });
    setSavingEdit(false);
    if (result.error) {
      pushError('Could not save category', result.error);
      return;
    }
    pushSuccess('Category updated', trimmed);
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDocById(COLLECTIONS.galleryCategories, deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) pushError('Could not delete category', result.error);
    else pushSuccess('Category deleted', deleteTarget.label);
  };

  const seedDefaults = async () => {
    setSeeding(true);
    for (const category of DEFAULT_GALLERY_CATEGORIES) {
      if (categories.some((c) => c.id === category.id)) continue;
      const result = await setDocById(COLLECTIONS.galleryCategories, category.id, category);
      if (result.error) {
        setSeeding(false);
        pushError('Could not add default categories', result.error);
        return;
      }
    }
    setSeeding(false);
    pushSuccess('Default categories added', `${DEFAULT_GALLERY_CATEGORIES.length} filter tabs are live.`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gallery categories"
        subtitle="These become the filter tabs on the public gallery page."
        action={
          <Link href="/admin/gallery">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to projects
            </Button>
          </Link>
        }
      />

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Add a category</h3>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px_auto] sm:items-end">
          <TextInput
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Balcony Gardens"
            hint="The slug is generated from the label."
          />
          <NumberInput label="Order" value={order} onChange={(e) => setOrder(Number(e.target.value) || 1)} />
          <Button onClick={addCategory} loading={savingNew} className="h-10">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          message="Add the filter categories you want on the public gallery, then file projects under them."
          icon={<Tags className="h-6 w-6" />}
          action={
            <Button onClick={seedDefaults} loading={seeding}>
              <Plus className="h-4 w-4" />
              Add the {DEFAULT_GALLERY_CATEGORIES.length} default categories
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-serif text-lg text-[#172b21]">{c.label}</h3>
                <p className="mt-0.5 text-xs text-[#aabcb0]">/{c.id}</p>
                <div className="mt-2">
                  <StatusPill
                    label={c.active === false ? 'Hidden' : 'Live'}
                    tone={c.active === false ? 'gray' : 'green'}
                    dot
                  />
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(c)}
                  className="rounded-lg p-2 text-[#52685a] hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit category"
        description="Renaming a category updates the label everywhere it is used."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={savingEdit}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextInput label="Label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
          <NumberInput label="Order" value={editOrder} onChange={(e) => setEditOrder(Number(e.target.value) || 1)} />
          <Toggle
            label="Show on the public gallery"
            description="Hidden categories keep their projects but drop the filter tab."
            checked={editActive}
            onChange={setEditActive}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete category"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.label}"? Projects filed under it will show as uncategorised.`
            : ''
        }
      />
    </div>
  );
}
