'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Sparkles,
  Download,
  Check,
  MessageCircle,
  Image as ImageIcon,
  Eye,
} from 'lucide-react';
import {
  DesignStudioLead,
  DesignStudioLeadStatus,
  DESIGN_STUDIO_LEAD_STATUS_LABELS,
} from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { updateDocById } from '@/lib/firestore/crud';
import { formatDateTime, getWhatsAppLink, toCsv, downloadCsv, cn } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/admin/Button';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { Modal } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/Toast';

const STATUS_TONES: Record<DesignStudioLeadStatus, string> = {
  new: 'blue',
  contacted: 'amber',
  converted: 'green',
  dismissed: 'gray',
};

const STATUS_FILTERS: ('all' | DesignStudioLeadStatus)[] = [
  'all',
  'new',
  'contacted',
  'converted',
  'dismissed',
];

/** `ai-studio` reads better as a title in the UI than as a raw source string. */
const SOURCE_LABELS: Record<string, string> = {
  'ai-studio': 'AI Studio',
};

function sourceLabel(source?: string): string {
  if (!source) return '—';
  return SOURCE_LABELS[source] ?? source;
}

export default function DesignStudioLeadsPage() {
  const { data: leads, loading } = useFirestoreCollection<DesignStudioLead>(
    COLLECTIONS.designStudioLeads,
    { orderByField: 'createdAt', orderDirection: 'desc' }
  );
  const { pushSuccess, pushError } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DesignStudioLeadStatus>('all');
  const [active, setActive] = useState<DesignStudioLead | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (!q) return true;
      return (
        lead.contact?.toLowerCase().includes(q) ||
        lead.name?.toLowerCase().includes(q) ||
        lead.description?.toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter]);

  const newCount = leads.filter((l) => l.status === 'new').length;
  const convertedCount = leads.filter((l) => l.status === 'converted').length;
  const withImageCount = leads.filter((l) => l.hasImage).length;

  const exportCsv = () => {
    const csv = toCsv(
      filtered.map((lead) => ({
        contact: lead.contact,
        name: lead.name,
        source: lead.source ?? '',
        description: lead.description ?? '',
        hasImage: lead.hasImage ? 'yes' : 'no',
        status: lead.status,
        createdAt: lead.createdAt,
      })),
      [
        { key: 'contact', label: 'Contact' },
        { key: 'name', label: 'Name' },
        { key: 'source', label: 'Source' },
        { key: 'description', label: 'Idea description' },
        { key: 'hasImage', label: 'Reference photo' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Generated at' },
      ]
    );
    downloadCsv(`design-studio-leads-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    pushSuccess('Export ready', `${filtered.length} rows`);
  };

  const setStatus = async (lead: DesignStudioLead, status: DesignStudioLeadStatus) => {
    setBusyId(lead.id);
    const result = await updateDocById(COLLECTIONS.designStudioLeads, lead.id, {
      status,
      updatedAt: new Date().toISOString(),
    });
    setBusyId(null);
    if (result.error) {
      pushError('Could not update lead', result.error);
      return;
    }
    setActive((a) => (a?.id === lead.id ? { ...a, status } : a));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Design Studio leads"
        subtitle={`${leads.length} generations · ${newCount} new · ${convertedCount} converted · ${withImageCount} with reference photo`}
        action={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ece3] p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aabcb0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or idea description…"
              className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
            />
          </div>
          <div className="flex gap-1.5 rounded-xl border border-[#e5ece3] p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'h-8 whitespace-nowrap rounded-lg px-3 text-xs font-semibold',
                  statusFilter === s
                    ? 'bg-[#14402a] text-white'
                    : 'font-medium text-[#52685a] hover:text-[#14402a]'
                )}
              >
                {s === 'all'
                  ? 'All'
                  : DESIGN_STUDIO_LEAD_STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <TableSkeleton columns={6} />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No Design Studio leads yet"
              message={
                leads.length === 0
                  ? 'Every generation started from the storefront Design Studio lands here automatically, tagged as an AI Studio lead.'
                  : 'Try a different filter or search term.'
              }
              icon={<Sparkles className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[#e5ece3] text-left text-xs uppercase tracking-wide text-[#52685a]">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Idea</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Generated</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-[#e5ece3] last:border-0 hover:bg-[#fafbfa]"
                  >
                    <td className="px-4 py-3 align-top">
                      <span className="block font-semibold text-[#172b21]">{lead.name}</span>
                      <span className="mt-0.5 block font-mono text-xs text-[#52685a]">
                        {lead.contact}
                      </span>
                    </td>
                    <td className="max-w-[320px] px-4 py-3 align-top">
                      {lead.description ? (
                        <span className="line-clamp-2 block text-xs text-[#52685a]">
                          {lead.description}
                        </span>
                      ) : (
                        <span className="text-xs text-[#aabcb0]">No description given</span>
                      )}
                      {lead.hasImage ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#14402a]">
                          <ImageIcon className="h-3.5 w-3.5" />
                          Reference photo
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <StatusPill label={sourceLabel(lead.source)} tone="violet" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-[#52685a]">
                      {formatDateTime(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill
                        label={
                          DESIGN_STUDIO_LEAD_STATUS_LABELS[lead.status] ?? lead.status
                        }
                        tone={STATUS_TONES[lead.status] ?? 'gray'}
                        dot
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={getWhatsAppLink(
                            `Hi ${lead.name}, thanks for trying the Green Decor Design Studio. Here are some ideas for your space — would you like a quote?`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                          title="Message them on WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setActive(lead)}
                          className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                          title="View details"
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
        title={active?.name ?? 'Design Studio lead'}
        description={active ? `Generated ${formatDateTime(active.createdAt)}` : undefined}
        footer={
          active ? (
            <Button variant="outline" onClick={() => setActive(null)}>
              Close
            </Button>
          ) : undefined
        }
      >
        {active ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                label={DESIGN_STUDIO_LEAD_STATUS_LABELS[active.status] ?? active.status}
                tone={STATUS_TONES[active.status] ?? 'gray'}
                dot
              />
              <StatusPill label={sourceLabel(active.source)} tone="violet" />
              {active.hasImage ? (
                <StatusPill label="Reference photo" tone="blue" />
              ) : null}
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e5ece3] p-3">
                <dt className="text-xs uppercase tracking-wide text-[#aabcb0]">Contact</dt>
                <dd className="mt-1 font-mono text-sm font-semibold text-[#172b21]">
                  {active.contact}
                </dd>
              </div>
              <div className="rounded-xl border border-[#e5ece3] p-3">
                <dt className="text-xs uppercase tracking-wide text-[#aabcb0]">Images</dt>
                <dd className="mt-1 text-sm text-[#172b21]">{active.imageCount ?? 0}</dd>
              </div>
            </dl>

            <div className="rounded-xl border border-[#e5ece3] p-3">
              <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Idea description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#172b21]">
                {active.description || 'The visitor did not describe their space.'}
              </p>
            </div>

            {active.userAgent ? (
              <div className="rounded-xl border border-[#e5ece3] p-3">
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Request metadata</p>
                <p className="mt-1 break-all font-mono text-xs text-[#52685a]">
                  {active.userAgent}
                </p>
              </div>
            ) : null}

            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-[#aabcb0]">Update status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.filter(
                  (s): s is DesignStudioLeadStatus => s !== 'all'
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(active, s)}
                    disabled={busyId === active.id}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40',
                      active.status === s
                        ? 'bg-[#14402a] text-white'
                        : 'bg-[#eaf0e7] text-[#14402a] hover:bg-[#dfe9dc]'
                    )}
                  >
                    {active.status === s ? <Check className="h-3.5 w-3.5" /> : null}
                    {DESIGN_STUDIO_LEAD_STATUS_LABELS[s] ?? s}
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