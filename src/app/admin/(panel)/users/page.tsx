'use client';

import { useMemo, useState } from 'react';
import { Users as UsersIcon, Search, Eye, Ban, RotateCcw, ShieldCheck } from 'lucide-react';
import { UserProfile, UserRole, UserStatus, Order } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { updateDocById } from '@/lib/firestore/crud';
import { formatPKR, formatDate } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/admin/Button';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { Modal } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/Toast';
import { ORDER_STATUS_LABELS } from '@/lib/firestore/orders';
import { orderStatusTone } from '@/components/admin/StatusPill';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  staff: 'Staff',
  customer: 'Customer',
};

const ROLE_TONES: Record<UserRole, string> = {
  admin: 'green',
  staff: 'violet',
  customer: 'gray',
};

export default function UsersPage() {
  const { data: users, loading } = useFirestoreCollection<UserProfile>(COLLECTIONS.users);
  const { data: orders } = useFirestoreCollection<Order>(COLLECTIONS.orders);
  const { pushSuccess, pushError } = useToast();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      if (!o.userId) continue;
      const cur = map.get(o.userId) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += o.total ?? 0;
      map.set(o.userId, cur);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (!q) return true;
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          (u.uid ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [users, search, roleFilter]);

  const setRole = async (u: UserProfile, role: UserRole) => {
    const result = await updateDocById(COLLECTIONS.users, u.uid, { role });
    if (result.error) pushError('Could not update role', result.error);
    else pushSuccess('Role updated', `${u.name} is now ${ROLE_LABELS[role]}`);
  };

  const setStatus = async (u: UserProfile, status: UserStatus) => {
    const result = await updateDocById(COLLECTIONS.users, u.uid, { status });
    if (result.error) pushError('Could not update status', result.error);
    else {
      pushSuccess(status === 'active' ? 'Account enabled' : 'Account disabled', u.email);
      setActiveUser((a) => (a?.uid === u.uid ? { ...a, status } : a));
    }
  };

  const userOrders = activeUser
    ? orders.filter((o) => o.userId === activeUser.uid)
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        subtitle={`${users.length} registered accounts`}
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ece3] p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aabcb0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone or UID…"
              className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'admin', 'staff', 'customer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={
                  roleFilter === r
                    ? 'h-10 whitespace-nowrap rounded-xl bg-[#14402a] px-3 text-sm font-semibold text-white'
                    : 'h-10 whitespace-nowrap rounded-xl border border-[#e5ece3] bg-white px-3 text-sm font-medium text-[#52685a] hover:text-[#14402a]'
                }
              >
                {r === 'all' ? 'All' : ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <TableSkeleton columns={7} />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No users found"
              message="Accounts created on the store or via the seed script appear here."
              icon={<UsersIcon className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-[#e5ece3] text-left text-xs uppercase tracking-wide text-[#52685a]">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Total spent</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const s = stats.get(u.uid);
                  return (
                    <tr key={u.uid} className="border-b border-[#e5ece3] last:border-0 hover:bg-[#fafbfa]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.photoURL} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf0e7] text-sm font-bold text-[#14402a]">
                              {u.name?.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="font-medium text-[#172b21]">{u.name}</p>
                            <p className="text-xs text-[#aabcb0]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill label={ROLE_LABELS[u.role] ?? u.role} tone={ROLE_TONES[u.role] ?? 'gray'} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          label={u.status === 'active' ? 'Active' : 'Disabled'}
                          tone={u.status === 'active' ? 'green' : 'red'}
                          dot
                        />
                      </td>
                      <td className="px-4 py-3 text-[#52685a]">{formatDate(u.createdAt ?? '')}</td>
                      <td className="px-4 py-3 text-[#52685a]">{s?.count ?? 0}</td>
                      <td className="px-4 py-3 font-semibold text-[#172b21]">{formatPKR(s?.total ?? 0)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <SelectRole value={u.role ?? 'customer'} onChange={(role) => setRole(u, role)} />
                          <button
                            type="button"
                            onClick={() => u.status === 'active' ? setStatus(u, 'disabled') : setStatus(u, 'active')}
                            className="rounded-lg p-2 text-[#52685a] hover:bg-[#f4f7f2]"
                            title={u.status === 'active' ? 'Disable account' : 'Enable account'}
                          >
                            {u.status === 'active' ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveUser(u)}
                            className="rounded-lg p-2 text-[#52685a] hover:bg-[#eaf0e7]"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!activeUser}
        onClose={() => setActiveUser(null)}
        title={activeUser?.name ?? 'User'}
        description={activeUser?.email}
        size="lg"
        footer={
          activeUser ? (
            <>
              <Button variant="outline" onClick={() => setActiveUser(null)}>
                Close
              </Button>
              <Button
                onClick={() => setStatus(activeUser, activeUser.status === 'active' ? 'disabled' : 'active')}
                variant={activeUser.status === 'active' ? 'danger' : 'primary'}
              >
                {activeUser.status === 'active' ? 'Disable account' : 'Enable account'}
              </Button>
            </>
          ) : undefined
        }
      >
        {activeUser ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e5ece3] p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Profile</p>
                <p className="mt-1 font-medium text-[#172b21]">{activeUser.name}</p>
                <p className="text-[#52685a]">{activeUser.phone || 'No phone'}</p>
                <p className="text-[#52685a]">Joined {formatDate(activeUser.createdAt ?? '')}</p>
              </div>
              <div className="rounded-xl border border-[#e5ece3] p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Access</p>
                <p className="mt-1">
                  <StatusPill label={ROLE_LABELS[activeUser.role] ?? activeUser.role} tone={ROLE_TONES[activeUser.role] ?? 'gray'} />
                </p>
                <p className="mt-1">
                  <StatusPill
                    label={activeUser.status === 'active' ? 'Active' : 'Disabled'}
                    tone={activeUser.status === 'active' ? 'green' : 'red'}
                    dot
                  />
                </p>
                {activeUser.role === 'admin' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#52685a]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Can access the admin panel
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-[#aabcb0]">
                Orders ({userOrders.length})
              </p>
              {userOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#cfe0cc] p-4 text-sm text-[#52685a]">
                  No orders linked to this account yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#e5ece3]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5ece3] text-left text-xs uppercase tracking-wide text-[#52685a]">
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userOrders.map((o) => (
                        <tr key={o.id} className="border-b border-[#e5ece3] last:border-0">
                          <td className="px-3 py-2 font-mono text-xs text-[#14402a]">#{o.id.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-[#52685a]">{formatDate(o.createdAt)}</td>
                          <td className="px-3 py-2 font-medium text-[#172b21]">{formatPKR(o.total)}</td>
                          <td className="px-3 py-2">
                            <StatusPill label={ORDER_STATUS_LABELS[o.status] ?? o.status} tone={orderStatusTone(o.status)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function SelectRole({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as UserRole)}
      className="h-9 rounded-lg border border-[#e5ece3] bg-white px-2 text-xs font-medium text-[#52685a] focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
      title="Change role"
    >
      <option value="customer">Customer</option>
      <option value="staff">Staff</option>
      <option value="admin">Admin</option>
    </select>
  );
}