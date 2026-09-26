'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Ticket, Percent, Banknote, Search, UserPlus } from 'lucide-react';
import { Coupon, WelcomeSubscriber } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { deleteDocById, replaceDocById, updateDocById } from '@/lib/firestore/crud';
import { uid, formatDate, formatDateTime, cn } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { ConfirmModal, Modal } from '@/components/admin/Modal';
import { TextInput } from '@/components/admin/form/TextInput';
import { NumberInput } from '@/components/admin/form/NumberInput';
import { Select } from '@/components/admin/form/Select';
import { Textarea } from '@/components/admin/form/Textarea';
import { Toggle } from '@/components/admin/form/Toggle';
import { useToast } from '@/components/admin/Toast';
import { formatPKR } from '@/lib/utils';

const WELCOME_SOURCE = 'welcome-popup';
const SOURCE_FILTERS = ['all', WELCOME_SOURCE, 'manual'] as const;
const SOURCE_LABELS: Record<string, string> = {
  all: 'All sources',
  [WELCOME_SOURCE]: 'Welcome popup',
  manual: 'Manual',
};

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
    source: 'manual',
    note: '',
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

/** `manual` is the catch-all for staff-created coupons, including untagged legacy ones. */
function matchesSource(coupon: Coupon, filter: (typeof SOURCE_FILTERS)[number]): boolean {
  if (filter === 'all') return true;
  if (filter === 'manual') return coupon.source !== WELCOME_SOURCE;
  return coupon.source === filter;
}

export default function CouponsPage() {
  const { data: coupons, loading } = useFirestoreCollection<Coupon>(COLLECTIONS.coupons);
  const { data: subscribers } = useFirestoreCollection<WelcomeSubscriber>(
    COLLECTIONS.welcomeSubscribers
  );
  const { pushSuccess, pushError } = useToast();

  const [editing, setEditing] = useState<Coupon | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_FILTERS)[number]>('all');

  // `coupons` is world-readable, so the welcome endpoint never writes PII to a
  // coupon document. Recover it here from the private subscriber record, keyed
  // by the shared code, so the coupon table still shows who claimed what.
  const subscriberByCode = useMemo(() => {
    const map = new Map<string, WelcomeSubscriber>();
    for (const s of subscribers) {
      if (s.code) map.set(s.code.toUpperCase(), s);
    }
    return map;
  }, [subscribers]);

  const claimContact = useCallback(
    (c: Coupon) => c.contact ?? subscriberByCode.get(c.code?.toUpperCase() ?? '')?.contact ?? '',
    [subscriberByCode]
  );

  const claimEmail = useCallback(
    (c: Coupon) => c.email ?? subscriberByCode.get(c.code?.toUpperCase() ?? '')?.email ?? '',
    [subscriberByCode]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((c) => {
      if (!matchesSource(c, sourceFilter)) return false;
      if (!q) return true;
      return (
        c.code?.toLowerCase().includes(q) ||
        c.note?.toLowerCase().includes(q) ||
        claimContact(c).toLowerCase().includes(q) ||
        claimEmail(c).toLowerCase().includes(q)
      );
    });
  }, [coupons, search, sourceFilter, claimContact, claimEmail]);

  const welcomeCount = coupons.filter((c) => c.source === WELCOME_SOURCE).length;

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
    const code = editing.code.trim().toUpperCase();
    if (!code) {
      pushError('Could not save coupon', 'A code is required — the cart matches on it exactly.');
      return;
    }
    setSaving(true);
    const payload: Coupon = {
      ...editing,
      code,
      value: Number(editing.value) || 0,
      minOrder: Number(editing.minOrder) || 0,
      usedCount: Number(editing.usedCount) || 0,
      usageLimit: editing.usageLimit ?? undefined,
      expiresAt: editing.expiresAt || undefined,
      source: editing.source || undefined,
      note: editing.note?.trim() || undefined,
    };
    // Full overwrite so clearing an optional field actually removes it. Also
    // strip claimant PII from legacy documents: `coupons` is world-readable,
    // so contact/email must live in welcomeSubscribers, never here.
    const mutable = payload as unknown as Record<string, unknown>;
    delete mutable.contact;
    delete mutable.email;
    // Full overwrite so clearing an optional field actually removes it.
    const result = await replaceDocById(COLLECTIONS.coupons, editing.id, payload);
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
        subtitle={`${coupons.length} coupons · ${welcomeCount} issued by the welcome popup · the cart and checkout read these live`}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            New coupon
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aabcb0]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, note or claimant…"
            className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
          />
        </div>
        <div className="flex gap-1.5 rounded-xl border border-[#e5ece3] p-1">
          {SOURCE_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSourceFilter(s)}
              className={cn(
                'h-8 whitespace-nowrap rounded-lg px-3 text-xs font-semibold',
                sourceFilter === s
                  ? 'bg-[#14402a] text-white'
                  : 'font-medium text-[#52685a] hover:text-[#14402a]'
              )}
            >
              {SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={5} />
      ) : coupons.length === 0 ? (
        <EmptyState
          title="No coupons yet"
          message="Create discount codes that customers can apply at checkout."
          icon={<Ticket className="h-6 w-6" />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No coupons match"
          message="Try a different search term or source filter."
          icon={<Ticket className="h-6 w-6" />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const status = couponStatus(c);
            const isWelcome = c.source === WELCOME_SOURCE;
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

                {isWelcome ? (
                  <div className="mt-3 rounded-xl bg-[#eaf0e7] p-2.5 text-xs text-[#14402a]">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <UserPlus className="h-3.5 w-3.5" />
                      Issued by the welcome popup
                    </p>
                    {claimContact(c) ? (
                      <p className="mt-1 font-mono">{claimContact(c)}</p>
                    ) : null}
                    {c.claimedAt ? (
                      <p className="mt-0.5 text-[#52685a]">Claimed {formatDateTime(c.claimedAt)}</p>
                    ) : null}
                  </div>
                ) : null}

                {c.note ? (
                  <p className="mt-3 text-xs italic text-[#52685a]">{c.note}</p>
                ) : null}

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
            hint="Stored uppercase with no spaces — the cart matches on it exactly."
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

          <div className="space-y-4 border-t border-[#e5ece3] pt-4">
            <Select
              label="Source"
              value={editing?.source ?? 'manual'}
              onChange={(e) => set('source', e.target.value)}
              hint="Welcome-popup coupons are minted by the store. Only change this to retag one."
            >
              <option value="manual">Manual</option>
              <option value="welcome-popup">Welcome popup</option>
              <option value="campaign">Campaign</option>
            </Select>
            <Textarea
              label="Internal note"
              rows={2}
              value={editing?.note ?? ''}
              onChange={(e) => set('note', e.target.value)}
              placeholder="e.g. Spring campaign — Instagram"
            />
            {editing?.source === WELCOME_SOURCE ? (
              <div className="rounded-xl border border-[#e5ece3] bg-[#f4f7f2] p-3 text-xs text-[#52685a]">
                <p className="font-semibold text-[#172b21]">Claimed by</p>
                <p className="mt-0.5 font-mono">{claimContact(editing) || 'Unknown'}</p>
                {claimEmail(editing) ? <p className="mt-0.5">{claimEmail(editing)}</p> : null}
                <p className="mt-1.5 text-[#6b8073]">
                  Kept in the private subscriber record. Not stored on the coupon because coupon
                  documents are world-readable.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#52685a]">
                No claimant. Coupon documents are world-readable, so contact details are never
                saved here.
              </p>
            )}
            {editing?.claimedAt ? (
              <p className="text-xs text-[#52685a]">Claimed {formatDateTime(editing.claimedAt)}</p>
            ) : null}
          </div>
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
