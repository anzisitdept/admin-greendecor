'use client';

import { useParams } from 'next/navigation';
import { GalleryProject } from '@/types';
import { useFirestoreDoc } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { GalleryProjectForm } from '@/components/admin/forms/GalleryProjectForm';

export default function EditGalleryProjectPage() {
  const params = useParams<{ id: string }>();
  const { data, loading } = useFirestoreDoc<GalleryProject>(COLLECTIONS.galleryProjects, params.id);

  if (loading) {
    return (
      <div className="space-y-5">
        <CardSkeleton />
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="Project not found" message="This project may have been deleted." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Edit gallery project" subtitle={data.title} />
      <Card>
        <GalleryProjectForm initial={data} />
      </Card>
    </div>
  );
}
