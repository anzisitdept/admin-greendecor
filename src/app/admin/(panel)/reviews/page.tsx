'use client';

import { useMemo, useState } from 'react';
import { Search, Star, MessageSquare, Eye, Trash2, Check, X } from 'lucide-react';
import { ProductReview, ReviewType, ReviewStatus } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { updateDocById, deleteDocById } from '@/lib/firestore/crud';
import { formatDateTime, cn } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/admin/Button';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { ConfirmModal, Modal } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/Toast';

const TYPE_LABELS: Record<ReviewType, string> = {
  general: 'General',
  private: 'Private',
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const TYPE_FILTERS: ('all' | ReviewType)[] = ['all', 'general', 'private'];
const STATUS_FILTERS: ('all' | ReviewStatus)[] = ['all', 'pending', 'approved', 'rejected'];

export function reviewStatusTone(status: ReviewStatus): string {
  switch (status) {
    case 'pending':
      return 'amber';
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    default:
      return 'gray';
  }
}

export default function ReviewsPage() {
  const { data: reviews, loading } = useFirestoreCollection<ProductReview>(
    COLLECTIONS.reviews,
    { orderByField: 'createdAt', orderDirection: 'desc' }
  );
  const { pushSuccess, pushError } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ReviewType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all');
  const [active, setActive] = useState<ProductReview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductReview | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.authorName?.toLowerCase().includes(q) ||
        r.text?.toLowerCase().includes(q) ||
        r.productSlug?.toLowerCase().includes(q) ||
        r.productId?.toLowerCase().includes(q)
      );
    });
  }, [reviews, search, typeFilter, statusFilter]);

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;

  const setStatus = async (review: ProductReview, status: ReviewStatus) => {
    setBusyId(review.id);
    const result = await updateDocById(COLLECTIONS.reviews, review.id, { status });
    setBusyId(null);
    if (result.error) {
      pushError('Could not update review', result.error);
      return;
    }
    pushSuccess(
      status === 'approved' ? 'Review approved' : status === 'rejected' ? 'Review rejected' : 'Review marked pending',
      review.authorName
    );
    setActive((a) => (a?.id === review.id ? { ...a, status } : a));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDocById(COLLECTIONS.reviews, deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) pushError('Could not delete review', result.error);
    else pushSuccess('Review deleted', deleteTarget.authorName);
  };

  const renderStars = (rating: number) => (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3.5 w-3.5',
            i < rating ? 'fill-[#d47343] text-[#d47343]' : 'text-[#d4e0d2]'
          )}
        />
      ))}
    </span>
  );

  const approvalActions = (review: ProductReview, className?: string) => (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => setStatus(review, 'approved')}
        disabled={busyId === review.id || review.status === 'approved'}
        className="inline-flex items-center gap-1 rounded-lg bg-[#eaf0e7] px-2.5 py-1.5 text-xs font-semibold text-[#14402a] hover:bg-[#dfe9dc] disabled:opacity-40"
        title="Approve — general reviews go live instantly"
      >
        <Check className="h-3.5 w-3.5" />
        Approve
      </button>
      <button
        type="button"
        onClick={() => setStatus(review, 'rejected')}
        disabled={busyId === review.id || review.status === 'rejected'}
        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
        title="Reject"
      >
        <X className="h-3.5 w-3.5" />
        Reject
      </button>
      <button
        type="button"
        onClick={() => setStatus(review, 'pending')}
        disabled={busyId === review.id || review.status === 'pending'}
        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
        title="Move back to pending"
      >
        Pending
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reviews"
        subtitle={`${reviews.length} reviews · ${pendingCount} awaiting approval`}
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ece3] p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aabcb0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, review text or product…"
              className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex gap-1.5 rounded-xl border border-[#e5ece3] p-1">
              {TYPE_FILTERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={
                    typeFilter === t
                      ? 'h-8 whitespace-nowrap rounded-lg bg-[#14402a] px-3 text-xs font-semibold text-white'
                      : 'h-8 whitespace-nowrap rounded-lg px-3 text-xs font-medium text-[#52685a] hover:text-[#14402a]'
                  }
                >
                  {t === 'all' ? 'All types' : TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 rounded-xl border border-[#e5ece3] p-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={
                    statusFilter === s
                      ? 'h-8 whitespace-nowrap rounded-lg bg-[#14402a] px-3 text-xs font-semibold text-white'
                      : 'h-8 whitespace-nowrap rounded-lg px-3 text-xs font-medium text-[#52685a] hover:text-[#14402a]'
                  }
                >
                  {s === 'all' ? 'All' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <TableSkeleton columns={6} />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No reviews found"
              message={
                reviews.length === 0
                  ? 'Customer reviews submitted on the store appear here for approval.'
                  : 'Try a different filter or search term.'
              }
              icon={<MessageSquare className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[#e5ece3] text-left text-xs uppercase tracking-wide text-[#52685a]">
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const textPreview =
                    r.text.length > 120 ? `${r.text.slice(0, 120).trim()}…` : r.text;
                  return (
                    <tr key={r.id} className="border-b border-[#e5ece3] last:border-0 hover:bg-[#fafbfa]">
                      <td className="px-4 py-3 align-top">
                        <span className="block font-semibold text-[#172b21]">
                          {r.authorName || 'Anonymous'}
                        </span>
                        <span className="mt-0.5 block">{renderStars(r.rating ?? 0)}</span>
                        {r.productSlug ? (
                          <span className="mt-1 block text-xs text-[#aabcb0]">
                            on {r.productSlug.replace(/-/g, ' ')}
                          </span>
                        ) : null}
                      </td>
                      <td className="max-w-[360px] px-4 py-3 align-top text-[#52685a]">
                        {textPreview}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusPill
                          label={TYPE_LABELS[r.type] ?? r.type}
                          tone={r.type === 'private' ? 'violet' : 'blue'}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-[#52685a]">
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusPill
                          label={STATUS_LABELS[r.status] ?? r.status}
                          tone={reviewStatusTone(r.status)}
                          dot
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          {approvalActions(r)}
                          <button
                            type="button"
                            onClick={() => setActive(r)}
                            className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                            title="View full review"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            className="rounded-lg p-2 text-[#52685a] hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.authorName ?? 'Review'}
        description={
          active
            ? `Submitted ${formatDateTime(active.createdAt)}${
                active.productSlug ? ` · on ${active.productSlug.replace(/-/g, ' ')}` : ''
              }`
            : undefined
        }
        footer={
          active ? (
            <>
              <Button variant="outline" onClick={() => setActive(null)}>
                Close
              </Button>
              <Button
                variant={active.status === 'approved' ? 'outline' : 'primary'}
                onClick={() => active && setStatus(active, 'approved')}
                disabled={active.status === 'approved'}
              >
                <Check className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant={active.status === 'rejected' ? 'outline' : 'danger'}
                onClick={() => active && setStatus(active, 'rejected')}
                disabled={active.status === 'rejected'}
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
            </>
          ) : undefined
        }
      >
        {active ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[#172b21]">
                {renderStars(active.rating ?? 0)}
                <span className="ml-1 text-[#52685a]">({active.rating}/5)</span>
              </span>
              <StatusPill
                label={TYPE_LABELS[active.type] ?? active.type}
                tone={active.type === 'private' ? 'violet' : 'blue'}
              />
              <StatusPill
                label={STATUS_LABELS[active.status] ?? active.status}
                tone={reviewStatusTone(active.status)}
                dot
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-[#aabcb0]">Review text</p>
              <p className="whitespace-pre-wrap rounded-xl border border-[#e5ece3] bg-[#fafbfa] p-3 text-sm text-[#172b21]">
                {active.text}
              </p>
            </div>

            {active.productId || active.productSlug ? (
              <div className="rounded-xl border border-[#e5ece3] p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Related product</p>
                <p className="mt-1 font-medium text-[#172b21]">
                  {active.productSlug ? active.productSlug.replace(/-/g, ' ') : active.productId}
                </p>
              </div>
            ) : null}

            {active.type === 'private' ? (
              <p className="rounded-xl bg-violet-50 p-3 text-xs text-violet-700">
                Private feedback — only visible to your team, never shown publicly. Respond via your
                usual support channels.
              </p>
            ) : (
              <p className="rounded-xl bg-[#eaf0e7] p-3 text-xs text-[#14402a]">
                Approving this review makes it live instantly on the public testimonials and product
                pages.
              </p>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete review"
        message={`Are you sure you want to delete this review from ${deleteTarget?.authorName ?? 'the customer'}?`}
      />
    </div>
  );
}