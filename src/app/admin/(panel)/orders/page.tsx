'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart } from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { formatPKR, formatDate } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { StatusPill, orderStatusTone, paymentStatusTone } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { ORDER_STATUS_LABELS } from '@/lib/firestore/orders';

const STATUS_FILTERS: { value: 'all' | OrderStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value: value as OrderStatus, label })),
];

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank_transfer: 'Bank transfer',
};

export default function OrdersPage() {
  const { data: orders, loading } = useFirestoreCollection<Order>(COLLECTIONS.orders, {
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false;
      if (!q) return true;
      const name = o.shippingAddress?.fullName?.toLowerCase() ?? '';
      const phone = o.shippingAddress?.phone?.toLowerCase() ?? '';
      const id = o.id?.toLowerCase() ?? '';
      return (
        id.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        o.shippingAddress?.city?.toLowerCase().includes(q)
      );
    });
  }, [orders, search, status]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} orders synced from Firestore`}
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ece3] p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aabcb0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID, customer, phone or city…"
              className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={
                  status === f.value
                    ? 'h-10 whitespace-nowrap rounded-xl bg-[#14402a] px-3 text-sm font-semibold text-white'
                    : 'h-10 whitespace-nowrap rounded-xl border border-[#e5ece3] bg-white px-3 text-sm font-medium text-[#52685a] hover:text-[#14402a]'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <TableSkeleton columns={7} />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No orders found"
              message={
                orders.length
                  ? 'No orders match the current filters.'
                  : 'Orders placed on the store will appear here when customers check out.'
              }
              icon={<ShoppingCart className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-[#e5ece3] text-left text-xs uppercase tracking-wide text-[#52685a]">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-[#e5ece3] last:border-0 hover:bg-[#fafbfa]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-semibold text-[#14402a] hover:underline">
                        #{o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#52685a]">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-[#172b21]">{o.shippingAddress?.fullName ?? '—'}</span>
                      <span className="text-xs text-[#aabcb0]">{o.shippingAddress?.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-[#52685a]">{o.shippingAddress?.city ?? '—'}</td>
                    <td className="px-4 py-3 text-[#52685a]">{(o.items ?? []).reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="px-4 py-3 font-semibold text-[#172b21]">{formatPKR(o.total ?? 0)}</td>
                    <td className="px-4 py-3">
                      <StatusPill label={PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod} tone={paymentStatusTone(o.paymentStatus)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill label={ORDER_STATUS_LABELS[o.status] ?? o.status} tone={orderStatusTone(o.status)} dot />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}