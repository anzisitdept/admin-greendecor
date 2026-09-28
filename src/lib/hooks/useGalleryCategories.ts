'use client';

import { useMemo } from 'react';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { DEFAULT_GALLERY_CATEGORIES } from '@/lib/data/galleryCategories';
import type { GalleryCategory } from '@/types';

export interface GalleryCategoryOption {
  value: string;
  label: string;
}

/**
 * Live gallery categories for the admin UI. Reads the same `galleryCategories`
 * documents the public gallery filter renders from, so a category added here
 * appears in the project form without a redeploy. Inactive categories are
 * excluded from the select but still listed in the category manager.
 */
export function useGalleryCategories(): {
  categories: GalleryCategoryOption[];
  labels: Record<string, string>;
  loading: boolean;
  error: string | null;
} {
  const { data, loading, error } = useFirestoreCollection<GalleryCategory>(
    COLLECTIONS.galleryCategories,
    { orderByField: 'order', orderDirection: 'asc' }
  );

  return useMemo(() => {
    const source = data.length > 0 ? data : DEFAULT_GALLERY_CATEGORIES;
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
