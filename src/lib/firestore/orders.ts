'use client';

import { Order, OrderStatus } from '@/types';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { db } from '@/lib/firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { updateDocById } from '@/lib/firestore/crud';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Steps shown in the status stepper. Note: remains active if cancelled. */
export const ORDER_STEPS: OrderStatus[] = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];

export interface TrackResult {
  data: Order | null;
  error: string | null;
}

function toIso(date: string | { toDate?: () => Date } | undefined): string {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  if (typeof date.toDate === 'function') return date.toDate().toISOString();
  return new Date().toISOString();
}

/**
 * Updates the order status, appending to `statusHistory`. Adjusts product
 * stock when the order ships (deduct) or is cancelled (restore).
 */
export async function updateOrderStatusWithStock(
  order: Order,
  nextStatus: OrderStatus,
  note = ''
): Promise<TrackResult> {
  const prevStatus = order.status;
  const today = new Date().toISOString();

  const historyEntry = {
    status: nextStatus,
    timestamp: today,
    note,
  };

  const orderRef = doc(db, COLLECTIONS.orders, order.id);

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(orderRef);
      if (!snap.exists()) throw new Error('Order no longer exists');

      const current = snap.data() as Record<string, unknown>;
      const currentStatus = (current.status as OrderStatus) ?? prevStatus;
      const effectiveChange = (() => {
        if (nextStatus === 'shipped' && currentStatus !== 'shipped') return 'deduct' as const;
        if (nextStatus === 'cancelled' && currentStatus !== 'cancelled') return 'restore' as const;
        return null;
      })();
      const currentHistory = Array.isArray(current.statusHistory) ? (current.statusHistory as unknown[]) : [];
      const history = [...currentHistory, historyEntry];

      transaction.update(orderRef, {
        status: nextStatus,
        statusHistory: history,
      });

      if (effectiveChange) {
        const items = (current.items as Order['items']) ?? order.items;
        for (const item of items) {
          if (!item.product?.id) continue;
          const productRef = doc(db, COLLECTIONS.products, item.product.id);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) continue;
          const productData = productSnap.data() as { stock?: number };
          const currentStock = typeof productData.stock === 'number' ? productData.stock : 0;
          const delta = effectiveChange === 'deduct' ? -item.quantity : item.quantity;
          const nextStock = Math.max(0, currentStock + delta);
          transaction.update(productRef, { stock: nextStock });
        }
      }
    });

    return { data: { ...order, status: nextStatus, statusHistory: [...(order.statusHistory ?? []), historyEntry] }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update order status' };
  }
}

export async function updateOrderPaymentStatus(
  order: Order,
  paymentStatus: Order['paymentStatus']
): Promise<TrackResult> {
  const result = await updateDocById(COLLECTIONS.orders, order.id, {
    paymentStatus,
    paymentUpdatedAt: serverTimestamp(),
  });
  if (result.error) return { data: null, error: result.error };
  return { data: { ...order, paymentStatus }, error: null };
}

export async function setOrderTrackingNumber(
  order: Order,
  trackingNumber: string
): Promise<TrackResult> {
  const result = await updateDocById(COLLECTIONS.orders, order.id, {
    trackingNumber,
    trackingUpdatedAt: serverTimestamp(),
  });
  if (result.error) return { data: null, error: result.error };
  return { data: { ...order, trackingNumber }, error: null };
}

export function orderHelper(order: Order): {
  id: string;
  createdAt: string;
  itemsCount: number;
  customer: string;
  phone: string;
  city: string;
  paymentLabel: string;
} {
  const createdAt = toIso(order.createdAt);
  return {
    id: order.id,
    createdAt,
    itemsCount: (order.items ?? []).reduce((sum, i) => sum + i.quantity, 0),
    customer: order.shippingAddress?.fullName ?? '—',
    phone: order.shippingAddress?.phone ?? '—',
    city: order.shippingAddress?.city ?? '—',
    paymentLabel: order.paymentMethod,
  };
}

export { toIso };