'use client';

import { useMemo, useState } from 'react';
import { Search, ClipboardList, MessageCircle, Phone, Eye } from 'lucide-react';
import { ServiceRequest, ServiceRequestStatus } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { updateDocById } from '@/lib/firestore/crud';
import { getWhatsAppLink, formatDateTime } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/admin/Button';
import { StatusPill, serviceRequestTone } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { Modal } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/Toast';

const STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  consultation_scheduled: 'Consultation',
  completed: 'Completed',
};

const STATUS_FLOW: ServiceRequestStatus[] = ['new', 'contacted', 'consultation_scheduled', 'completed'];

export default function QuotesPage() {
  const { data: requests, loading } = useFirestoreCollection<ServiceRequest>(
    COLLECTIONS.serviceRequests,
    { orderByField: 'createdAt', orderDirection: 'desc' }
  );
  const { pushSuccess, pushError } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceRequestStatus>('all');
  const [active, setActive] = useState<ServiceRequest | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.fullName?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.serviceTitle?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q)
      );
    });
  }, [requests, search, statusFilter]);

  const setStatus = async (r: ServiceRequest, status: ServiceRequestStatus) => {
    const result = await updateDocById(COLLECTIONS.serviceRequests, r.id, { status });
    if (result.error) pushError('Could not update status', result.error);
    else {
      pushSuccess('Status updated', STATUS_LABELS[status]);
      setActive((a) => (a?.id === r.id ? { ...a, status } : a));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Service quotes"
        subtitle={`${requests.length} requests from the "Request a Quote" forms`}
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ece3] p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aabcb0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email or service…"
              className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {(['all', ...STATUS_FLOW] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={
                  statusFilter === s
                    ? 'h-10 whitespace-nowrap rounded-xl bg-[#14402a] px-3 text-sm font-semibold text-white'
                    : 'h-10 whitespace-nowrap rounded-xl border border-[#e5ece3] bg-white px-3 text-sm font-medium text-[#52685a] hover:text-[#14402a]'
                }
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <TableSkeleton columns={6} />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No quote requests"
              message="When customers submit the Request a Quote form these appear here."
              icon={<ClipboardList className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b border-[#e5ece3] text-left text-xs uppercase tracking-wide text-[#52685a]">
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Budget</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-[#e5ece3] last:border-0 hover:bg-[#fafbfa]">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#172b21]">{r.serviceTitle || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-[#172b21]">{r.fullName}</span>
                      <span className="text-xs text-[#aabcb0]">{r.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-[#52685a]">{r.city || '—'}</td>
                    <td className="px-4 py-3 text-[#52685a]">{r.propertyType}</td>
                    <td className="px-4 py-3 text-[#52685a]">{r.budget || '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#52685a]">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusPill label={STATUS_LABELS[r.status] ?? r.status} tone={serviceRequestTone(r.status)} dot />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={getWhatsAppLink(
                            `Hi ${r.fullName}, thanks for your quote request for "${r.serviceTitle}".`,
                            r.phone
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7] hover:text-[#14402a]"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <a
                          href={`tel:${r.phone}`}
                          className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7] hover:text-[#14402a]"
                          title="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setActive(r)}
                          className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                          title="Open"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.serviceTitle ?? 'Quote request'}
        description={active ? `From ${active.fullName}` : undefined}
        size="lg"
        footer={
          active ? (
            <>
              <Button variant="outline" onClick={() => setActive(null)}>
                Close
              </Button>
              <a
                href={getWhatsAppLink(
                  `Hi ${active.fullName}, thanks for your quote request for "${active.serviceTitle}".`,
                  active.phone
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#14402a] px-4 text-sm font-semibold text-white hover:bg-[#0d2b1c]"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </>
          ) : undefined
        }
      >
        {active ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e5ece3] p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Contact</p>
                <p className="mt-1 font-medium text-[#172b21]">{active.fullName}</p>
                <p className="text-[#52685a]">{active.phone}</p>
                <p className="text-[#52685a]">{active.email}</p>
              </div>
              <div className="rounded-xl border border-[#e5ece3] p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Project</p>
                <p className="mt-1 font-medium text-[#172b21]">{active.propertyType}</p>
                <p className="text-[#52685a]">{active.city}, Pakistan</p>
                <p className="text-[#52685a]">Budget: {active.budget || 'Not specified'}</p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-[#aabcb0]">Message</p>
              <p className="rounded-xl border border-[#e5ece3] bg-[#fafbfa] p-3 text-sm text-[#172b21]">
                {active.message || '—'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-[#aabcb0]">Update status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(active, s)}
                    disabled={active.status === s}
                    className={
                      active.status === s
                        ? 'h-10 rounded-xl bg-[#14402a] px-3 text-sm font-semibold text-white disabled:opacity-100'
                        : 'h-10 rounded-xl border border-[#e5ece3] bg-white px-3 text-sm font-medium text-[#52685a] hover:border-[#14402a] hover:text-[#14402a]'
                    }
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}