'use client';

import { useParams } from 'next/navigation';
import { ServiceItem } from '@/types';
import { useFirestoreDoc } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { ServiceForm } from '@/components/admin/forms/ServiceForm';

export default function EditServicePage() {
  const params = useParams<{ id: string }>();
  const { data, loading } = useFirestoreDoc<ServiceItem>(COLLECTIONS.services, params.id);

  if (loading) {
    return (
      <div className="space-y-5">
        <CardSkeleton />
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="Service not found" message="This service may have been deleted." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Edit service" subtitle={data.title} />
      <Card>
        <ServiceForm initial={data} />
      </Card>
    </div>
  );
}