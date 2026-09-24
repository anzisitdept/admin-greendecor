'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Banknote,
  ClipboardList,
  Package,
  Star,
  MessageSquareQuote,
  ArrowRight,
} from 'lucide-react';
import { Order, Product, ServiceRequest, Testimonial, ProductReview } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { formatPKR, formatDate, cn } from '@/lib/utils';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { StatusPill, orderStatusTone } from '@/components/admin/StatusPill';
import { ORDER_STATUS_LABELS } from '@/lib/firestore/orders';

const LOW_STOCK_THRESHOLD = 6;

function startOfDay(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DashboardPage() {
  const { data: orders, loading: ordersLoading } = useFirestoreCollection<Order>(
    COLLECTIONS.orders,
    { orderByField: 'createdAt', orderDirection: 'desc' }
  );
  const { data: servicesRequests } = useFirestoreCollection<ServiceRequest>(
    COLLECTIONS.serviceRequests
  );
  const { data: products } = useFirestoreCollection<Product>(COLLECTIONS.products);
  const { data: testimonials } = useFirestoreCollection<Testimonial>(COLLECTIONS.testimonials);
  const { data: reviews } = useFirestoreCollection<ProductReview>(COLLECTIONS.reviews);
  const [range, setRange] = useState<7 | 30>(7);

  const analytics = useMemo(() => {
    const today = startOfDay(0);
    const todayOrders = orders.filter((o) => {
      const d = new Date(o.createdAt ?? '');
      return !Number.isNaN(d.getTime()) && d >= today;
    });
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.total ?? 0), 0);

    const newQuotes = servicesRequests.filter((r) => r.status === 'new').length;
    const lowStock = products.filter((p) => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD).length;
    const pendingTestimonials = testimonials.filter((t) => !t.approved).length;
    const pendingReviews = reviews.filter((r) => r.status === 'pending').length;

    const days: { date: Date; label: string; total: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = startOfDay(i);
      const total = orders
        .filter((o) => {
          const od = new Date(o.createdAt ?? '');
          return !Number.isNaN(od.getTime()) && od >= d && od < new Date(d.getTime() + 86400000);
        })
        .reduce((s, o) => s + (o.total ?? 0), 0);
      days.push({
        date: d,
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        total,
      });
    }

    const max = Math.max(...days.map((d) => d.total), 1);
    const chartData = days.map((d, i) => ({
      ...d,
      x: i,
      y: max > 0 ? (d.total / max) * 100 : 0,
    }));

    const productRevenue = new Map<string, { name: string; quantity: number; revenue: number; image?: string }>();
    for (const o of orders) {
      for (const item of o.items ?? []) {
        if (!item.product?.id) continue;
        const cur = productRevenue.get(item.product.id) ?? {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
          image: item.product.images?.[0],
        };
        cur.quantity += item.quantity;
        const price = item.product.salePrice ?? item.product.price ?? 0;
        cur.revenue += price * item.quantity;
        productRevenue.set(item.product.id, cur);
      }
    }
    const topProducts = Array.from(productRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const revenueRange = days.reduce((s, d) => s + d.total, 0);
    const growthPct = 0;

    return {
      todayOrders: todayOrders.length,
      todayRevenue,
      newQuotes,
      lowStock,
      pendingTestimonials,
      pendingReviews,
      chartData,
      revenueRange,
      growthPct,
      topProducts,
      max,
    };
  }, [orders, servicesRequests, products, testimonials, reviews, range]);

  const recentOrders = orders.slice(0, 5);

  if (ordersLoading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  const kpis = [
    {
      label: "Today's orders",
      value: String(analytics.todayOrders),
      icon: ShoppingCart,
      href: '/admin/orders',
      tone: 'text-[#14402a] bg-[#eaf0e7]',
    },
    {
      label: "Today's revenue",
      value: formatPKR(analytics.todayRevenue),
      icon: Banknote,
      href: '/admin/orders',
      tone: 'text-[#b85b2e] bg-[#fdf0e8]',
    },
    {
      label: 'New quote requests',
      value: String(analytics.newQuotes),
      icon: ClipboardList,
      href: '/admin/quotes',
      tone: 'text-sky-700 bg-sky-50',
    },
    {
      label: 'Low stock products',
      value: String(analytics.lowStock),
      icon: Package,
      href: '/admin/products',
      tone: 'text-[#b45309] bg-amber-50',
    },
    {
      label: 'Pending testimonials',
      value: String(analytics.pendingTestimonials),
      icon: Star,
      href: '/admin/testimonials',
      tone: 'text-violet-700 bg-violet-50',
    },
    {
      label: 'Pending reviews',
      value: String(analytics.pendingReviews),
      icon: MessageSquareQuote,
      href: '/admin/reviews',
      tone: 'text-sky-700 bg-sky-50',
    },
  ];

  const { chartData, max } = analytics;
  const width = 720;
  const height = 240;
  const padding = { top: 12, right: 12, bottom: 28, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const step = innerW / Math.max(1, chartData.length - 1);

  const points = chartData
    .map((d, i) => `${padding.left + i * step},${padding.top + innerH - (d.y / 100) * innerH}`)
    .join(' ');
  const areaPoints = `${padding.left},${padding.top + innerH} ${points} ${padding.left + (chartData.length - 1) * step},${padding.top + innerH}`;

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle="Live overview of your store right now." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="transition-shadow hover:card-shadow-hover">
                <div className="flex items-center justify-between">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpi.tone)}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold text-[#172b21]">{kpi.value}</p>
                <p className="mt-0.5 text-xs font-medium text-[#52685a]">{kpi.label}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg text-[#172b21]">Sales</h3>
              <p className="text-xs text-[#52685a]">
                {formatPKR(analytics.revenueRange)} in the last {range} days
              </p>
            </div>
            <div className="flex gap-1 rounded-xl border border-[#e5ece3] p-1">
              {([7, 30] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold',
                    range === r ? 'bg-[#14402a] text-white' : 'text-[#52685a] hover:text-[#14402a]'
                  )}
                >
                  {r} days
                </button>
              ))}
            </div>
          </div>

          <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Sales chart">
            {[0, 25, 50, 75, 100].map((pct) => {
              const y = padding.top + innerH - (pct / 100) * innerH;
              return (
                <g key={pct}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#e5ece3"
                    strokeDasharray={pct === 0 ? '0' : '4 4'}
                  />
                  <text x={padding.left - 6} y={y + 3} textAnchor="end" className="fill-[#aabcb0]" fontSize="10">
                    {max > 0 ? Math.round(max * (pct / 100)) : 0}
                  </text>
                </g>
              );
            })}
            <polygon points={areaPoints} className="fill-[#14402a]/10" />
            <polyline
              points={points}
              fill="none"
              stroke="#14402a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chartData.map((d, i) => (
              <g key={i}>
                <circle
                  cx={padding.left + i * step}
                  cy={padding.top + innerH - (d.y / 100) * innerH}
                  r={3}
                  className="fill-[#14402a]"
                />
                {i % Math.ceil(chartData.length / 8) === 0 || i === chartData.length - 1 ? (
                  <text
                    x={padding.left + i * step}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-[#52685a]"
                    fontSize="10"
                  >
                    {d.label}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-lg text-[#172b21]">Top products by revenue</h3>
            <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-semibold text-[#14402a] hover:underline">
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {analytics.topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e7] text-[#52685a]">
                    <Package className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#172b21]">{p.name}</p>
                  <p className="text-xs text-[#aabcb0]">{p.quantity} sold</p>
                </div>
                <span className="text-sm font-semibold text-[#172b21]">{formatPKR(p.revenue)}</span>
              </div>
            ))}
            {analytics.topProducts.length === 0 ? (
              <p className="text-sm text-[#52685a]">No sales yet.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg text-[#172b21]">Recent orders</h3>
          <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-[#14402a] hover:underline">
            View all orders
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-[#52685a]">No orders yet. They will appear here as customers check out.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#e5ece3] text-left text-xs uppercase tracking-wide text-[#52685a]">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-[#e5ece3] last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-semibold text-[#14402a] hover:underline">
                        #{o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-medium text-[#172b21]">{o.shippingAddress?.fullName ?? '—'}</td>
                    <td className="px-3 py-2 text-[#52685a]">{formatDate(o.createdAt)}</td>
                    <td className="px-3 py-2 font-semibold text-[#172b21]">{formatPKR(o.total ?? 0)}</td>
                    <td className="px-3 py-2">
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