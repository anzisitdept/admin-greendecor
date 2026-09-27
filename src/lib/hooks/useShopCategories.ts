'use client';

import { useMemo } from 'react';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { DEFAULT_CATEGORIES } from '@/lib/data/categories';
import type { ProductCategoryDoc } from '@/types';

export interface ShopCategory {
  value: ProductCategoryDoc['id'];
  label: string;
}

/**
 * Live shop categories for the admin UI. Reads the same `categories` documents
 * the customer-facing shop filter uses, so a category added there shows up in
 * the product form without a redeploy. Inactive categories are excluded.
 */
export function useShopCategories(): {
  categories: ShopCategory[];
  labels: Record<string, string>;
  loading: boolean;
  error: string | null;
} {
  const { data, loading, error } = useFirestoreCollection<ProductCategoryDoc>(
    COLLECTIONS.categories,
    { orderByField: 'order', orderDirection: 'asc' }
  );

  return useMemo(() => {
    const source = data.length > 0 ? data : DEFAULT_CATEGORIES;
    const active = source.filter((category) => category.active !== false);
    const categories = active.map(({ id, label }) => ({ value: id, label }));
    return {
      categories,
      labels: Object.fromEntries(categories.map((c) => [c.value, c.label])),
      loading,
      error,
    };
  }, [data, loading, error]);
}
