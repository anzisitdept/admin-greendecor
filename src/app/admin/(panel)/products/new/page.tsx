'use client';

import { PageHeader } from '@/components/admin/PageHeader';
import { ProductForm, getInitialProduct } from '@/components/admin/forms/ProductForm';
import { Card } from '@/components/admin/Card';

export default function NewProductPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New product" subtitle="The product will be live on the store as soon as it is published." />
      <Card>
        <ProductForm initial={getInitialProduct()} />
      </Card>
    </div>
  );
}