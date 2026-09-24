'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Truck,
  Check,
  AlertCircle,
  StickyNote,
} from 'lucide-react';
import { Order, OrderStatus, PaymentMethod } from '@/types';
import { useFirestoreDoc } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import {
  updateOrderStatusWithStock,
  updateOrderPaymentStatus,
  setOrderTrackingNumber,
  ORDER_STATUS_LABELS,
  ORDER_STEPS,
} from '@/lib/firestore/orders';
import { formatPKR, formatDateTime, cn } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/admin/Button';
import { StatusPill, orderStatusTone, paymentStatusTone } from '@/components/admin/StatusPill';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { Select } from '@/components/admin/form/Select';
import { useToast } from '@/components/admin/Toast';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: 'Cash on delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank_transfer: 'Bank transfer',
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { pushSuccess, pushError } = useToast();
  const { data: order, loading } = useFirestoreDoc<Order>(COLLECTIONS.orders, params.id);

  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [tracking, setTracking] = useState('');

  if (loading) {
    return (
      <div className="space-y-5">
        <CardSkeleton />
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        message="This order may have been deleted."
      />
    );
  }

  const items = order.items ?? [];
  const history = order.statusHistory ?? [];

  const updateStatus = async (next: OrderStatus) => {
    setBusy(true);
    const result = await updateOrderStatusWithStock(order, next, note.trim());
    setBusy(false);
    if (result.error) {
      pushError('Could not update status', result.error);
      return;
    }
    setNote('');
    pushSuccess('Order updated', `Status changed to ${ORDER_STATUS_LABELS[next]}`);
  };

  const updatePayment = async (paymentStatus: Order['paymentStatus']) => {
    const result = await updateOrderPaymentStatus(order, paymentStatus);
    if (result.error) pushError('Could not update payment', result.error);
    else pushSuccess('Payment updated', paymentStatus);
  };

  const saveTracking = async () => {
    setTrackingBusy(true);
    const result = await setOrderTrackingNumber(order, tracking.trim());
    setTrackingBusy(false);
    if (result.error) pushError('Could not save tracking number', result.error);
    else {
      setTracking('');
      pushSuccess('Tracking number saved');
    }
  };

  const activeStepIndex = ORDER_STEPS.indexOf(order.status);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/orders')}
          className="rounded-xl border border-[#e5ece3] bg-white p-2 text-[#52685a] hover:text-[#14402a]"
          aria-label="Back to orders"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader
          title={`Order #${order.id.slice(0, 8)}`}
          subtitle={formatDateTime(order.createdAt)}
        />
        <StatusPill label={ORDER_STATUS_LABELS[order.status]} tone={orderStatusTone(order.status)} dot />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <h3 className="mb-4 font-serif text-lg text-[#172b21]">Order status</h3>
            <div className="mb-6 flex items-center gap-0">
              {ORDER_STEPS.map((step, i) => {
                const done = order.status === 'delivered' || (order.status !== 'cancelled' && i <= activeStepIndex);
                const isCurrent = order.status !== 'cancelled' && i === activeStepIndex;
                return (
                  <div key={step} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border-2',
                          done ? 'border-[#14402a] bg-[#14402a] text-white' : 'border-[#d4e0d2] bg-white text-[#aabcb0]',
                          isCurrent && 'ring-4 ring-[#14402a]/15'
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                      <span className={cn('text-xs font-medium', done ? 'text-[#14402a]' : 'text-[#aabcb0]')}>
                        {ORDER_STATUS_LABELS[step]}
                      </span>
                    </div>
                    {i < ORDER_STEPS.length - 1 ? (
                      <div
                        className={cn(
                          'mx-1 h-0.5 flex-1 -mt-6',
                          done ? 'bg-[#14402a]' : 'bg-[#e5ece3]'
                        )}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {order.status === 'cancelled' ? (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                This order was cancelled. Product stock has been restored.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {(['confirmed', 'processing', 'shipped', 'delivered'] as OrderStatus[]).map(
                (step) => {
                  const isNext = ORDER_STEPS.indexOf(step) === activeStepIndex + 1;
                  return (
                    <button
                      key={step}
                      type="button"
                      disabled={busy || order.status === step || order.status === 'cancelled' || order.status === 'delivered'}
                      onClick={() => updateStatus(step)}
                      className={cn(
                        'h-10 rounded-xl px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40',
                        isNext
                          ? 'bg-[#14402a] text-white hover:bg-[#0d2b1c]'
                          : 'border border-[#e5ece3] bg-white text-[#52685a] hover:border-[#14402a] hover:text-[#14402a]'
                      )}
                    >
                      Mark {ORDER_STATUS_LABELS[step]}
                    </button>
                  );
                }
              )}
              {order.status !== 'cancelled' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => updateStatus('cancelled')}
                  className="h-10 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  Cancel order
                </button>
              ) : null}
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-[#172b21]">Note for this update</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note appended to the status history…"
                  className="h-10 flex-1 rounded-xl border border-[#e5ece3] bg-white px-3 text-sm placeholder:text-[#aabcb0] focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
                />
                <Button variant="outline" disabled={!note.trim()} onClick={() => updateStatus(order.status)}>
                  <StickyNote className="h-4 w-4" />
                  Add note
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg text-[#172b21]">Items</h3>
              <StatusPill label={`${items.reduce((s, i) => s + i.quantity, 0)} items`} tone="gray" />
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-xl border border-[#e5ece3] p-3">
                  {item.product?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.product.images[0]} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eaf0e7] text-[#52685a]">
                      <Package className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#172b21]">{item.product?.name ?? 'Unknown product'}</p>
                    {item.selectedOption ? (
                      <p className="text-xs text-[#aabcb0]">{item.selectedOption}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#172b21]">
                      {formatPKR((item.product?.salePrice ?? item.product?.price ?? 0) * item.quantity)}
                    </p>
                    <p className="text-xs text-[#aabcb0]">
                      {formatPKR(item.product?.salePrice ?? item.product?.price ?? 0)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-[#e5ece3] pt-4 text-sm">
              <div className="flex justify-between text-[#52685a]">
                <span>Subtotal</span>
                <span>{formatPKR(order.subtotal ?? 0)}</span>
              </div>
              {order.discount ? (
                <div className="flex justify-between text-[#52685a]">
                  <span>Discount</span>
                  <span className="text-[#b85b2e]">−{formatPKR(order.discount ?? 0)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[#52685a]">
                <span>Shipping</span>
                <span>{order.shippingFee ? formatPKR(order.shippingFee) : 'Free'}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-[#e5ece3] pt-2 text-base font-bold text-[#172b21]">
                <span>Total</span>
                <span>{formatPKR(order.total ?? 0)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 font-serif text-lg text-[#172b21]">Timeline</h3>
            {history.length === 0 ? (
              <p className="text-sm text-[#52685a]">No status updates yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-[#e5ece3] pl-5">
                {[...history].reverse().map((h, idx) => (
                  <li key={idx} className="relative">
                    <span
                      className={cn(
                        'absolute -left-[26.5px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2',
                        h.status === 'cancelled' ? 'border-red-500 bg-white' : 'border-[#14402a] bg-white'
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          h.status === 'cancelled' ? 'bg-red-500' : 'bg-[#14402a]'
                        )}
                      />
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-[#172b21]">
                        {ORDER_STATUS_LABELS[h.status] ?? h.status}
                      </span>
                      <span className="text-xs text-[#aabcb0]">{formatDateTime(h.timestamp)}</span>
                    </div>
                    {h.note ? (
                      <p className="mt-0.5 text-xs text-[#52685a]">{h.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h3 className="mb-3 font-serif text-lg text-[#172b21]">Delivery address</h3>
            <div className="space-y-2 text-sm text-[#172b21]">
              <p className="font-semibold">{order.shippingAddress?.fullName}</p>
              <p className="flex items-center gap-2 text-[#52685a]">
                <Phone className="h-3.5 w-3.5" /> {order.shippingAddress?.phone}
              </p>
              {order.shippingAddress?.email ? (
                <p className="flex items-center gap-2 text-[#52685a]">
                  <Mail className="h-3.5 w-3.5" /> {order.shippingAddress.email}
                </p>
              ) : null}
              <p className="flex items-start gap-2 text-[#52685a]">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {order.shippingAddress?.streetAddress}
                {order.shippingAddress?.apartmentSuite ? `, ${order.shippingAddress.apartmentSuite}` : ''},
                {order.shippingAddress?.city}, {order.shippingAddress?.province}
                {order.shippingAddress?.postalCode ? ` — ${order.shippingAddress.postalCode}` : ''}
              </p>
              {order.shippingAddress?.notes ? (
                <p className="flex items-start gap-2 text-xs text-[#52685a]">
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {order.shippingAddress.notes}
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 font-serif text-lg text-[#172b21]">Payment</h3>
            <p className="text-sm font-medium capitalize text-[#172b21]">
              {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <StatusPill label={order.paymentStatus} tone={paymentStatusTone(order.paymentStatus)} dot />
              <Select
                value={order.paymentStatus}
                onChange={(e) => updatePayment(e.target.value as Order['paymentStatus'])}
              >
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="failed">failed</option>
              </Select>
            </div>
            <div className="mt-4 border-t border-[#e5ece3] pt-3">
              <label className="flex items-center gap-2 text-sm font-medium text-[#172b21]">
                <Truck className="h-4 w-4" />
                Tracking number
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={tracking || order.trackingNumber || ''}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. TCS-9988776655"
                  className="h-10 flex-1 rounded-xl border border-[#e5ece3] bg-white px-3 text-sm placeholder:text-[#aabcb0] focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
                />
                <Button
                  size="sm"
                  className="h-10"
                  onClick={saveTracking}
                  loading={trackingBusy}
                  disabled={(tracking || order.trackingNumber) === (order.trackingNumber ?? '') && !tracking}
                >
                  Save
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 font-serif text-lg text-[#172b21]">Customer</h3>
            <div className="space-y-1.5 text-sm text-[#52685a]">
              <p>{order.userId ? `Account user: ${order.userId.slice(0, 12)}…` : 'Guest checkout'}</p>
              <p className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" />
                {order.discount ? `Coupon discount applied (${formatPKR(order.discount)})` : 'No discount applied'}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}