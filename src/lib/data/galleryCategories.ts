import type { GalleryCategory } from '@/types';

/**
 * Offline fallback for the `galleryCategories` collection. The gallery form and
 * filter always prefer the live documents and only fall back to this list while
 * the collection is loading or empty, so the select is never blank.
 */
export const DEFAULT_GALLERY_CATEGORIES: GalleryCategory[] = [
  { id: 'landscaping', label: 'Lawn & Landscaping', order: 1, active: true },
  { id: 'patios', label: 'Rooftops & Patios', order: 2, active: true },
  { id: 'indoor', label: 'Indoor Living Spaces', order: 3, active: true },
  { id: 'aquariums', label: 'Planted Aquariums', order: 4, active: true },
  { id: 'commercial', label: 'Commercial & Offices', order: 5, active: true },
];
