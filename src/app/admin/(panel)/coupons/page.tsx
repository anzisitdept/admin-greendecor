'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Ticket, Percent, Banknote } from 'lucide-react';
import { Coupon } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { createDoc, deleteDocById, updateDocById } from '@/lib/firestore/crud';
import { uid, formatDate } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { ConfirmModal, Modal } from '@/components/admin/Modal';
import { TextInput } from '@/components/admin/form/TextInput';
import { NumberInput } from '@/components/admin/form/NumberInput';
import { Select } from '@/components/admin/form/Select';
import { Toggle } from '@/components/admin/form/Toggle';
import { useToast } from '@/components/admin/Toast';
import { formatPKR } from '@/lib/utils';

function emptyCoupon(): Coupon {
  return {
    id: uid(),
    code: '',
    type: 'percent',
    value: 10,
    minOrder: 0,
    active: true,
    usageLimit: undefined,
    usedCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function couponStatus(c: Coupon): { label: string; tone: string } {
  if (!c.active) return { label: 'Inactive', tone: 'gray' };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now())
    return { label: 'Expired', tone: 'red' };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit)
    return { label: 'Used up', tone: 'red' };
  return { label: 'Active', tone: 'green' };
}

export default function CouponsPage() {
  const { data: coupons, loading } = useFirestoreCollection<Coupon>(COLLECTIONS.coupons);
  const { pushSuccess, pushError } = useToast();

  const [editing, setEditing] = useState<Coupon | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openNew = () => {
    setIsNew(true);
    setEditing(emptyCoupon());
  };

  const openEdit = (c: Coupon) => {
    setIsNew(false);
    setEditing({ ...c });
  };

  const close = () => {
    setEditing(null);
    setIsNew(false);
  };

  const set = <K extends keyof Coupon>(key: K, value: Coupon[K]) =>
    setEditing((e) => (e ? { ...e, [key]: value } : e));

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload: Coupon = {
      ...editing,
      code: editing.code.trim().toUpperCase(),
      value: Number(editing.value) || 0,
      minOrder: Number(editing.minOrder) || 0,
      usedCount: Number(editing.usedCount) || 0,
      expiresAt: editing.expiresAt || undefined,
    };
    const result = isNew
      ? await createDoc(COLLECTIONS.coupons, payload, payload.id)
      : await updateDocById(COLLECTIONS.coupons, editing.id, payload);
    setSaving(false);
    if (result.error) {
      pushError('Could not save coupon', result.error);
      return;
    }
    pushSuccess(isNew ? 'Coupon created' : 'Coupon updated', payload.code);
    close();
  };

  const toggleActive = async (c: Coupon) => {
    const result = await updateDocById(COLLECTIONS.coupons, c.id, { active: !c.active });
    if (result.error) pushError('Could not update coupon', result.error);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDocById(COLLECTIONS.coupons, deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) pushError('Could not delete coupon', result.error);
    else pushSuccess('Coupon deleted', deleteTarget.code);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coupons & discounts"
        subtitle={`${coupons.length} coupons · the cart and checkout read these live`}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            New coupon
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton columns={5} />
      ) : coupons.length === 0 ? (
        <EmptyState
          title="No coupons yet"
          message="Create discount codes that customers can apply at checkout."
          icon={<Ticket className="h-6 w-6" />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((c) => {
            const status = couponStatus(c);
            return (
              <Card key={c.id} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf0e7] text-[#14402a]">
                    {c.type === 'percent' ? <Percent className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                  </div>
                  <StatusPill label={status.label} tone={status.tone} dot />
                </div>

                <div className="mt-3">
                  <p className="font-mono text-lg font-bold tracking-wider text-[#172b21]">{c.code}</p>
                  <p className="text-sm font-semibold text-[#d47343]">
                    {c.type === 'percent' ? `${c.value}% off` : `${formatPKR(c.value)} off`}
                  </p>
                </div>

                <div className="mt-3 space-y-1 text-xs text-[#52685a]">
                  <p>Min order: {c.minOrder ? formatPKR(c.minOrder) : 'None'}</p>
                  <p>
                    Usage:{' '}
                    {c.usageLimit != null ? `${c.usedCount} / ${c.usageLimit}` : `${c.usedCount} used`}
                  </p>
                  <p>{c.expiresAt ? `Expires ${formatDate(c.expiresAt)}` : 'No expiry'}</p>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-[#e5ece3] pt-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-[#14402a] hover:bg-[#eaf0e7]"
                  >
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      className="rounded-lg p-2 text-[#52685a] hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={close}
        title={isNew ? 'New coupon' : 'Edit coupon'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {isNew ? 'Create' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextInput
            label="Code"
            value={editing?.code ?? ''}
            onChange={(e) => set('code', e.target.value)}
            placeholder="e.g. WELCOME15"
            className="uppercase"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Type" value={editing?.type ?? 'percent'} onChange={(e) => set('type', e.target.value as 'percent' | 'flat')}>
              <option value="percent">Percent (%)</option>
              <option value="flat">Flat (PKR)</option>
            </Select>
            <NumberInput
              label={editing?.type === 'percent' ? 'Percent value' : 'Flat value (PKR)'}
              value={editing?.value ?? 0}
              onChange={(e) => set('value', Number(e.target.value))}
              required
            />
          </div>
          <NumberInput
            label="Minimum order (PKR)"
            value={editing?.minOrder ?? 0}
            onChange={(e) => set('minOrder', Number(e.target.value))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberInput
              label="Usage limit (blank = unlimited)"
              value={editing?.usageLimit ?? ''}
              onChange={(e) =>
                set('usageLimit', e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
            <TextInput
              label="Expiry date"
              type="date"
              value={editing?.expiresAt ? editing.expiresAt.slice(0, 10) : ''}
              onChange={(e) => set('expiresAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
            />
          </div>
          <Toggle
            label="Active"
            description="Allowed at checkout"
            checked={editing?.active ?? true}
            onChange={(v) => set('active', v)}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete coupon"
        message={`Delete coupon ${deleteTarget?.code}? It will stop working immediately.`}
      />
    </div>
  );
}