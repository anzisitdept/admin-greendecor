'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Package,
  Layers,
} from 'lucide-react';
import { Product } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { deleteDocById, updateDocById } from '@/lib/firestore/crud';
import { formatPKR } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { ConfirmModal, Modal } from '@/components/admin/Modal';
import { NumberInput } from '@/components/admin/form/NumberInput';
import { useShopCategories } from '@/lib/hooks/useShopCategories';
import { useToast } from '@/components/admin/Toast';

const LOW_STOCK_THRESHOLD = 6;

export default function ProductsPage() {
  const { data: products, loading } = useFirestoreCollection<Product>(COLLECTIONS.products);
  const { pushSuccess, pushError } = useToast();
  const { categories, labels } = useShopCategories();
  const categoryFilters = useMemo(
    () => [{ value: 'all', label: 'All categories' }, ...categories],
    [categories]
  );

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stockModal, setStockModal] = useState(false);
  const [bulkStock, setBulkStock] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (lowStockOnly && p.stock > LOW_STOCK_THRESHOLD) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !(p.slug ?? '').toLowerCase().includes(q) &&
        !(p.tags ?? []).some((t) => t.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [products, search, category, lowStockOnly]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((p) => p.id));
    });
  };

  const toggleField = async (product: Product, field: 'featured' | 'isNew' | 'inStock') => {
    setUpdatingId(product.id);
    const next = !product[field];
    const result = await updateDocById(COLLECTIONS.products, product.id, { [field]: next });
    setUpdatingId(null);
    if (result.error) pushError(`Could not update ${field}`, result.error);
  };

  const applyBulkStock = async () => {
    const ids = Array.from(selected);
    setStockModal(false);
    const results = await Promise.all(
      ids.map((id) =>
        updateDocById(COLLECTIONS.products, id, { stock: bulkStock, inStock: bulkStock > 0 })
      )
    );
    if (results.some((r) => r.error)) {
      pushError('Some products could not be updated');
    } else {
      pushSuccess('Stock updated', `${ids.length} products set to ${bulkStock}`);
    }
    setSelected(new Set());
  };

  const applyBulkFeatured = async (featured: boolean) => {
    const ids = Array.from(selected);
    const results = await Promise.all(
      ids.map((id) => updateDocById(COLLECTIONS.products, id, { featured }))
    );
    if (results.some((r) => r.error)) {
      pushError('Some products could not be updated');
    } else {
      pushSuccess(featured ? 'Products featured' : 'Products unfeatured', `${ids.length} updated`);
    }
    setSelected(new Set());
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDocById(COLLECTIONS.products, deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) pushError('Could not delete product', result.error);
    else pushSuccess('Product deleted', deleteTarget.name);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        subtitle={`${products.length} products · seeded data is live from Firestore`}
        action={
          <Link href="/admin/products/new">
            <Button>
              <Plus className="h-4 w-4" />
              New product
            </Button>
          </Link>
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ece3] p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aabcb0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, slug or tag…"
              className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-xl border border-[#e5ece3] bg-white px-3 text-sm focus:outline-none"
          >
            {categoryFilters.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e5ece3] bg-white px-3 text-sm font-medium text-[#172b21]">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="accent-[#14402a]"
            />
            Low stock only (&lt;{LOW_STOCK_THRESHOLD})
          </label>
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#e5ece3] bg-[#f4f7f2] px-4 py-2.5">
            <span className="text-sm font-medium text-[#172b21]">{selected.size} selected</span>
            <Button size="sm" variant="secondary" onClick={() => setStockModal(true)}>
              <Layers className="h-3.5 w-3.5" />
              Set stock
            </Button>
            <Button size="sm" variant="secondary" onClick={() => applyBulkFeatured(true)}>
              <Star className="h-3.5 w-3.5" />
              Feature
            </Button>
            <Button size="sm" variant="secondary" onClick={() => applyBulkFeatured(false)}>
              Unfeature
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        ) : null}

        {loading ? (
          <TableSkeleton columns={6} />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No products found"
              message="Try a different search, or add your first product."
              icon={<Package className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-[#e5ece3] text-left text-xs uppercase tracking-wide text-[#52685a]">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="accent-[#14402a]"
                    />
                  </th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-[#e5ece3] last:border-0 hover:bg-[#fafbfa]">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelected(p.id)}
                        className="accent-[#14402a]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 group">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.images[0]}
                            alt=""
                            className="h-11 w-11 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf0e7] text-[#52685a]">
                            <Package className="h-5 w-5" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[260px] truncate font-medium text-[#172b21] group-hover:text-[#14402a]">
                            {p.name}
                          </span>
                          <span className="text-xs text-[#aabcb0]">/{p.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#52685a]">
                      {labels[p.category] ?? p.categoryLabel}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[#172b21]">{formatPKR(p.price ?? 0)}</span>
                      {p.salePrice ? (
                        <span className="ml-1.5 text-xs text-[#aabcb0] line-through">
                          {formatPKR(p.salePrice)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-medium text-[#172b21]">{p.stock ?? 0}</span>
                        {p.stock <= LOW_STOCK_THRESHOLD ? (
                          <StatusPill label="Low" tone="amber" />
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                          label={p.inStock ? 'In stock' : 'Out'}
                          tone={p.inStock ? 'green' : 'gray'}
                          dot
                        />
                        {p.featured ? <StatusPill label="Featured" tone="terracotta" /> : null}
                        {p.isNew ? <StatusPill label="New" tone="blue" /> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={updatingId === p.id}
                          onClick={() => toggleField(p, 'featured')}
                          className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7] disabled:opacity-40"
                          title={p.featured ? 'Unfeature' : 'Feature'}
                        >
                          <Star className={`h-4 w-4 ${p.featured ? 'fill-[#d47343] text-[#d47343]' : ''}`} />
                        </button>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="rounded-lg p-2 text-[#52685a] hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete product"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : ''
        }
      />

      <Modal
        open={stockModal}
        onClose={() => setStockModal(false)}
        title="Set stock"
        description={`Update stock for ${selected.size} selected product(s).`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setStockModal(false)}>
              Cancel
            </Button>
            <Button onClick={applyBulkStock}>Apply</Button>
          </>
        }
      >
        <NumberInput
          label="New stock level"
          value={bulkStock}
          onChange={(e) => setBulkStock(Number(e.target.value))}
        />
      </Modal>
    </div>
  );
}