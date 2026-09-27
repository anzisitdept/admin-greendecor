import type { ProductCategoryDoc } from '@/types';

/**
 * Offline fallback for the `categories` collection. The admin form always
 * prefers the live documents and only falls back to this list while the
 * collection is loading or empty, so the select is never blank.
 */
export const DEFAULT_CATEGORIES: ProductCategoryDoc[] = [
  { id: 'aquarium', label: 'Aquarium', order: 1, active: true },
  { id: 'candles', label: 'Candles', order: 2, active: true },
  { id: 'pots', label: 'Pots', order: 3, active: true },
  { id: 'wall-hangings', label: 'Wall hangings', order: 4, active: true },
  { id: 'chemicals', label: 'Chemicals', order: 5, active: true },
  { id: 'other', label: 'Other', order: 6, active: true },
];
