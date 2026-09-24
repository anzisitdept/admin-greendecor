'use client';

import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { ServiceForm, getInitialService } from '@/components/admin/forms/ServiceForm';

export default function NewServicePage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New service" subtitle="Field sets map 1:1 to the public service pages." />
      <Card>
        <ServiceForm initial={getInitialService()} />
      </Card>
    </div>
  );
}