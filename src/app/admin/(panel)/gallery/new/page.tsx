'use client';

import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { GalleryProjectForm, getInitialGalleryProject } from '@/components/admin/forms/GalleryProjectForm';

export default function NewGalleryProjectPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="New gallery project"
        subtitle="Pick a category, add the image, then write the title and short details."
      />
      <Card>
        <GalleryProjectForm initial={getInitialGalleryProject()} isNew />
      </Card>
    </div>
  );
}
