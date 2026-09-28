'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Images, Settings2, Search, Eye, EyeOff } from 'lucide-react';
import { GalleryProject } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { deleteDocById, updateDocById } from '@/lib/firestore/crud';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { StatusPill } from '@/components/admin/StatusPill';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { ConfirmModal } from '@/components/admin/Modal';
import { useGalleryCategories } from '@/lib/hooks/useGalleryCategories';
import { useToast } from '@/components/admin/Toast';

export default function GalleryPage() {
  const { data: projects, loading } = useFirestoreCollection<GalleryProject>(
    COLLECTIONS.galleryProjects,
    { orderByField: 'order', orderDirection: 'asc' }
  );
  const { pushSuccess, pushError } = useToast();
  const { categories, labels } = useGalleryCategories();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<GalleryProject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (q && !p.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, search, categoryFilter]);

  const liveCount = projects.filter((p) => p.active).length;

  const toggleActive = async (project: GalleryProject) => {
    setUpdatingId(project.id);
    const next = !project.active;
    const result = await updateDocById(COLLECTIONS.galleryProjects, project.id, { active: next });
    setUpdatingId(null);
    if (result.error) {
      pushError('Could not update project', result.error);
      return;
    }
    pushSuccess(
      next ? 'Project published' : 'Project hidden',
      next ? 'It is live on the public gallery now.' : 'Removed from the public gallery.'
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDocById(COLLECTIONS.galleryProjects, deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) pushError('Could not delete project', result.error);
    else pushSuccess('Project deleted', deleteTarget.title);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gallery Projects"
        subtitle={`${projects.length} projects · ${liveCount} live on the public gallery`}
        action={
          <>
            <Link href="/admin/gallery/categories">
              <Button variant="outline">
                <Settings2 className="h-4 w-4" />
                Categories
              </Button>
            </Link>
            <Link href="/admin/gallery/new">
              <Button>
                <Plus className="h-4 w-4" />
                New project
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aabcb0]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by title…"
            className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-xl border border-[#e5ece3] bg-white px-3 text-sm focus:outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No projects found"
          message="Add your first gallery project to populate the public gallery page."
          icon={<Images className="h-6 w-6" />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <StatusPill
                  label={labels[p.category] ?? p.category ?? 'Uncategorised'}
                  tone="green"
                />
                <div className="flex gap-1">
                  <Link
                    href={`/admin/gallery/${p.id}`}
                    className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
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

              {p.image ? (
                <div className="mt-4 h-36 overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="mt-4 flex h-36 items-center justify-center rounded-2xl bg-[#f4f7f2] text-xs text-[#aabcb0]">
                  No image
                </div>
              )}

              <div className="mt-4 flex-1">
                <h3 className="font-serif text-lg text-[#172b21]">{p.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-[#52685a]">{p.shortDetails}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e5ece3] pt-3">
                <StatusPill
                  label={p.active ? 'Live' : 'Hidden'}
                  tone={p.active ? 'green' : 'gray'}
                  dot
                />
                <span className="text-xs text-[#aabcb0]">Order {p.order ?? 0}</span>
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  disabled={updatingId === p.id}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#14402a] hover:bg-[#eaf0e7] disabled:opacity-50"
                >
                  {p.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {p.active ? 'Hide' : 'Publish'}
                </button>
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
        title="Delete project"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.title}"? It will be removed from the public gallery.`
            : ''
        }
      />
    </div>
  );
}
