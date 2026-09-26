'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  UserPlus,
  Download,
  Copy,
  Check,
  Ticket,
  ExternalLink,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { Coupon, WelcomeSubscriber, WelcomeSubscriberStatus } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { updateDocById } from '@/lib/firestore/crud';
import {
  formatDateTime,
  formatPKR,
  getWhatsAppLink,
  toCsv,
  downloadCsv,
  cn,
} from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/admin/Button';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { Modal } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/Toast';

const STATUS_LABELS: Record<WelcomeSubscriberStatus, string> = {
  active: 'Active',
  used: 'Used',
  expired: 'Expired',
};

const STATUS_TONES: Record<WelcomeSubscriberStatus, string> = {
  active: 'green',
  used: 'violet',
  expired: 'gray',
};

const STATUS_FILTERS: ('all' | WelcomeSubscriberStatus)[] = ['all', 'active', 'used', 'expired'];

interface SubscriberRow {
  subscriber: WelcomeSubscriber;
  coupon?: Coupon;
  status: WelcomeSubscriberStatus;
}

/**
 * The stored `status` is written once at signup and never refreshed, so the
 * live coupon document wins: it knows about redemptions and expiry.
 */
function resolveStatus(subscriber: WelcomeSubscriber, coupon?: Coupon): WelcomeSubscriberStatus {
  if (!coupon) return subscriber.status ?? 'active';
  if (!coupon.active) return 'expired';
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return 'expired';
  if (coupon.usedCount > 0) return 'used';
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return 'used';
  return 'active';
}

function couponValueLabel(coupon?: Coupon): string {
  if (!coupon) return '—';
  return coupon.type === 'percent' ? `${coupon.value}% off` : `${formatPKR(coupon.value)} off`;
}

export default function WelcomeSubscribersPage() {
  const { data: subscribers, loading } = useFirestoreCollection<WelcomeSubscriber>(
    COLLECTIONS.welcomeSubscribers,
    { orderByField: 'createdAt', orderDirection: 'desc' }
  );
  const { data: coupons } = useFirestoreCollection<Coupon>(COLLECTIONS.coupons);
  const { pushSuccess, pushError } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WelcomeSubscriberStatus>('all');
  const [active, setActive] = useState<SubscriberRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const couponByCode = useMemo(() => {
    const map = new Map<string, Coupon>();
    for (const c of coupons) map.set(c.code.toUpperCase(), c);
    return map;
  }, [coupons]);

  const rows = useMemo<SubscriberRow[]>(
    () =>
      subscribers.map((subscriber) => {
        const coupon = couponByCode.get((subscriber.code ?? '').toUpperCase());
        return { subscriber, coupon, status: resolveStatus(subscriber, coupon) };
      }),
    [subscribers, couponByCode]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.subscriber.contact?.toLowerCase().includes(q) ||
        row.subscriber.email?.toLowerCase().includes(q) ||
        row.subscriber.code?.toUpperCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const activeCount = rows.filter((r) => r.status === 'active').length;
  const usedCount = rows.filter((r) => r.status === 'used').length;
  const orphaned = rows.filter((r) => !r.coupon).length;

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      pushSuccess('Code copied', code);
    } catch {
      pushError('Could not copy code', 'Your browser blocked clipboard access.');
    }
  };

  const exportCsv = () => {
    const csv = toCsv(
      filtered.map((row) => ({
        contact: row.subscriber.contact,
        email: row.subscriber.email ?? '',
        code: row.subscriber.code,
        status: row.status,
        coupon: row.coupon ? couponValueLabel(row.coupon) : 'missing',
        usedCount: row.coupon?.usedCount ?? '',
        usageLimit: row.coupon?.usageLimit ?? '',
        expiresAt: row.coupon?.expiresAt ?? '',
        signedUpAt: row.subscriber.createdAt,
        source: row.subscriber.source ?? '',
      })),
      [
        { key: 'contact', label: 'Contact' },
        { key: 'email', label: 'Email' },
        { key: 'code', label: 'Coupon code' },
        { key: 'status', label: 'Status' },
        { key: 'coupon', label: 'Coupon' },
        { key: 'usedCount', label: 'Used count' },
        { key: 'usageLimit', label: 'Usage limit' },
        { key: 'expiresAt', label: 'Expires at' },
        { key: 'signedUpAt', label: 'Signed up at' },
        { key: 'source', label: 'Source' },
      ]
    );
    downloadCsv(`welcome-subscribers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    pushSuccess('Export ready', `${filtered.length} rows`);
  };

  const setStatus = async (row: SubscriberRow, status: WelcomeSubscriberStatus) => {
    setBusyId(row.subscriber.id);
    const result = await updateDocById(COLLECTIONS.welcomeSubscribers, row.subscriber.id, {
      status,
      updatedAt: new Date().toISOString(),
    });
    setBusyId(null);
    if (result.error) {
      pushError('Could not update subscriber', result.error);
      return;
    }
    setActive((a) =>
      a?.subscriber.id === row.subscriber.id
        ? { ...a, subscriber: { ...a.subscriber, status }, status }
        : a
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Welcome subscribers"
        subtitle={`${subscribers.length} signups · ${activeCount} unused · ${usedCount} redeemed${
          orphaned ? ` · ${orphaned} missing coupon` : ''
        }`}
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
              placeholder="Search by phone, email or coupon code…"
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
              title="No subscribers found"
              message={
                subscribers.length === 0
                  ? 'Signups from the store welcome popup land here automatically, each with the coupon code it was issued.'
                  : 'Try a different filter or search term.'
              }
              icon={<UserPlus className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[#e5ece3] text-left text-xs uppercase tracking-wide text-[#52685a]">
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Coupon code</th>
                  <th className="px-4 py-3">Offer</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const { subscriber, coupon, status } = row;
                  return (
                    <tr
                      key={subscriber.id}
                      className="border-b border-[#e5ece3] last:border-0 hover:bg-[#fafbfa]"
                    >
                      <td className="px-4 py-3 align-top">
                        <span className="block font-mono font-semibold text-[#172b21]">
                          {subscriber.contact}
                        </span>
                        {subscriber.email ? (
                          <span className="mt-0.5 block text-xs text-[#52685a]">
                            {subscriber.email}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono font-semibold text-[#172b21]">
                          {subscriber.code}
                        </span>
                        {coupon ? (
                          <span className="mt-0.5 block text-xs text-[#52685a]">
                            {coupon.usedCount} / {coupon.usageLimit ?? '∞'} used
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-red-600">
                            Coupon document missing
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-[#52685a]">
                        {couponValueLabel(coupon)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-[#52685a]">
                        {formatDateTime(subscriber.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusPill
                          label={STATUS_LABELS[status] ?? status}
                          tone={STATUS_TONES[status]}
                          dot
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => copyCode(subscriber.code)}
                            className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                            title="Copy code"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <a
                            href={getWhatsAppLink(
                              `Hi ${subscriber.contact}, here is your Green Decor welcome discount code: ${subscriber.code}`
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                            title="Send the code over WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setActive(row)}
                            className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
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
        title={active?.subscriber.contact ?? 'Subscriber'}
        description={active ? `Signed up ${formatDateTime(active.subscriber.createdAt)}` : undefined}
        footer={
          active ? (
            <>
              <Button variant="outline" onClick={() => setActive(null)}>
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => copyCode(active.subscriber.code)}
                disabled={busyId === active.subscriber.id}
              >
                <Copy className="h-4 w-4" />
                Copy code
              </Button>
            </>
          ) : undefined
        }
      >
        {active ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                label={STATUS_LABELS[active.status] ?? active.status}
                tone={STATUS_TONES[active.status]}
                dot
              />
              {active.subscriber.source ? (
                <StatusPill label={active.subscriber.source} tone="blue" />
              ) : null}
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e5ece3] p-3">
                <dt className="text-xs uppercase tracking-wide text-[#aabcb0]">Contact</dt>
                <dd className="mt-1 font-mono text-sm font-semibold text-[#172b21]">
                  {active.subscriber.contact}
                </dd>
              </div>
              <div className="rounded-xl border border-[#e5ece3] p-3">
                <dt className="text-xs uppercase tracking-wide text-[#aabcb0]">Email</dt>
                <dd className="mt-1 break-all text-sm text-[#172b21]">
                  {active.subscriber.email || '—'}
                </dd>
              </div>
            </dl>

            {active.coupon ? (
              <div className="rounded-xl border border-[#e5ece3] p-3">
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Issued coupon</p>
                <p className="mt-1 font-mono text-base font-bold text-[#172b21]">
                  {active.coupon.code}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-[#52685a]">
                  <li>{couponValueLabel(active.coupon)}</li>
                  <li>
                    Used {active.coupon.usedCount} of {active.coupon.usageLimit ?? 'unlimited'}
                  </li>
                  <li>
                    {active.coupon.expiresAt
                      ? `Expires ${formatDateTime(active.coupon.expiresAt)}`
                      : 'No expiry'}
                  </li>
                </ul>
                <Link
                  href="/admin/coupons"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#14402a] hover:underline"
                >
                  <Ticket className="h-3.5 w-3.5" />
                  Manage in Coupons
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
                No coupon document matches{' '}
                <span className="font-mono font-semibold">{active.subscriber.code}</span>. Create it
                in Coupons with that exact code or this signup cannot be redeemed.
              </p>
            )}

            {active.subscriber.ipHash || active.subscriber.userAgent ? (
              <div className="rounded-xl border border-[#e5ece3] p-3">
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Request metadata</p>
                {active.subscriber.ipHash ? (
                  <p className="mt-1 break-all font-mono text-xs text-[#52685a]">
                    IP hash: {active.subscriber.ipHash}
                  </p>
                ) : null}
                {active.subscriber.userAgent ? (
                  <p className="mt-1 break-all text-xs text-[#52685a]">
                    {active.subscriber.userAgent}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-[#aabcb0]">
                Override status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.filter((s): s is WelcomeSubscriberStatus => s !== 'all').map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(active, s)}
                      disabled={busyId === active.subscriber.id}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40',
                        active.status === s
                          ? 'bg-[#14402a] text-white'
                          : 'bg-[#eaf0e7] text-[#14402a] hover:bg-[#dfe9dc]'
                      )}
                    >
                      {active.status === s ? <Check className="h-3.5 w-3.5" /> : null}
                      {STATUS_LABELS[s]}
                    </button>
                  )
                )}
              </div>
              <p className="mt-2 text-xs text-[#52685a]">
                Manual overrides are stored on the subscriber, but the live coupon document wins
                when the two disagree.
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
