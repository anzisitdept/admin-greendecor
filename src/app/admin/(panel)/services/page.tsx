'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Leaf, CheckCircle2 } from 'lucide-react';
import { ServiceItem } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { deleteDocById } from '@/lib/firestore/crud';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { ConfirmModal } from '@/components/admin/Modal';
import { IconView } from '@/components/admin/form/IconPicker';
import { useToast } from '@/components/admin/Toast';

export default function ServicesPage() {
  const { data: services, loading } = useFirestoreCollection<ServiceItem>(COLLECTIONS.services);
  const { pushSuccess, pushError } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDocById(COLLECTIONS.services, deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) pushError('Could not delete service', result.error);
    else pushSuccess('Service deleted', deleteTarget.title);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Services"
        subtitle={`${services.length} services · the public service pages are built from these fields`}
        action={
          <Link href="/admin/services/new">
            <Button>
              <Plus className="h-4 w-4" />
              New service
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          title="No services yet"
          message="Add your first service to populate the public services pages."
          icon={<Leaf className="h-6 w-6" />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf0e7] text-[#14402a]">
                  <IconView name={s.icon} className="h-6 w-6" />
                </div>
                <div className="flex gap-1">
                  <Link
                    href={`/admin/services/${s.id}`}
                    className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(s)}
                    className="rounded-lg p-2 text-[#52685a] hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {s.heroImage ? (
                <div className="mt-4 h-36 overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.heroImage} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}

              <div className="mt-4 flex-1">
                <h3 className="font-serif text-lg text-[#172b21]">{s.title}</h3>
                <p className="mt-0.5 text-xs text-[#aabcb0]">/{s.slug}</p>
                <p className="mt-2 line-clamp-2 text-sm text-[#52685a]">{s.shortDescription}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e5ece3] pt-3 text-xs text-[#52685a]">
                <span className="inline-flex items-center gap-1 font-medium text-[#14402a]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {s.pricingRange || 'Pricing on request'}
                </span>
                <span className="ml-auto">{s.features?.length ?? 0} features</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete service"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.title}"? The public service page for this slug will no longer be available.`
            : ''
        }
      />
    </div>
  );
}