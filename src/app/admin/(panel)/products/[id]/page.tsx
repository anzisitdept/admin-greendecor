'use client';

import { useParams } from 'next/navigation';
import { Product } from '@/types';
import { useFirestoreDoc } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { ProductForm } from '@/components/admin/forms/ProductForm';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { data, loading } = useFirestoreDoc<Product>(COLLECTIONS.products, params.id);

  if (loading) {
    return (
      <div className="space-y-5">
        <CardSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Product not found"
        message="This product may have been deleted."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Edit product" subtitle={data.name} />
      <Card>
        <ProductForm initial={data} />
      </Card>
    </div>
  );
}