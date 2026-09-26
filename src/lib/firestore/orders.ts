'use client';

import { Order, OrderStatus } from '@/types';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { db } from '@/lib/firebase';
import { doc, runTransaction, serverTimestamp, type DocumentReference } from 'firebase/firestore';
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
 * Resolves the Firestore document for an order.
 *
 * Orders are created with `addDoc`, so the document id is auto-generated while
 * the `id` field holds the customer-facing number (`GD-49371`). Writing to
 * `doc(orders, order.id)` targets a document that does not exist, which is why
 * status updates used to fail with "Order no longer exists". Always prefer
 * `docId`; `id` is only a fallback for objects that never came from a snapshot.
 */
function orderRef(order: Order) {
  return doc(db, COLLECTIONS.orders, order.docId || order.id);
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

  const ref = orderRef(order);

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
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

      // Firestore requires every read to precede every write, so the product
      // documents are read up front into a map and only then mutated. Reading
      // them after `transaction.update` throws and silently aborted every
      // "shipped" / "cancelled" transition.
      const stockUpdates: { ref: DocumentReference; stock: number }[] = [];
      if (effectiveChange) {
        const items = (current.items as Order['items']) ?? order.items;
        // Quantities are summed per product first: the same product can appear
        // in more than one line item, and it must be read (and written) once
        // with the combined quantity.
        const quantities = new Map<string, number>();
        for (const item of items ?? []) {
          if (!item.product?.id) continue;
          const id = item.product.id;
          quantities.set(id, (quantities.get(id) ?? 0) + item.quantity);
        }

        for (const [productId, quantity] of quantities) {
          const productRef = doc(db, COLLECTIONS.products, productId);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) continue;
          const productData = productSnap.data() as { stock?: number };
          const currentStock = typeof productData.stock === 'number' ? productData.stock : 0;
          const delta = effectiveChange === 'deduct' ? -quantity : quantity;
          stockUpdates.push({ ref: productRef, stock: Math.max(0, currentStock + delta) });
        }
      }

      transaction.update(ref, {
        status: nextStatus,
        statusHistory: history,
      });

      for (const { ref: productRef, stock } of stockUpdates) {
        transaction.update(productRef, { stock });
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
  const result = await updateDocById(COLLECTIONS.orders, order.docId || order.id, {
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
  const result = await updateDocById(COLLECTIONS.orders, order.docId || order.id, {
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