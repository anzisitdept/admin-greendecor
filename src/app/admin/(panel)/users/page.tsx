'use client';

import { useMemo, useState } from 'react';
import { Users as UsersIcon, Search, Eye, Ban, RotateCcw, ShieldCheck, Plus, Phone } from 'lucide-react';
import { UserProfile, UserRole, UserStatus, Order } from '@/types';
import { useFirestoreCollection } from '@/lib/firestore/hooks';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { createDoc, updateDocById } from '@/lib/firestore/crud';
import { formatPKR, formatDate } from '@/lib/utils';
import { normalizeContact, formatContact } from '@/lib/phone';
import { PageHeader, EmptyState } from '@/components/admin/PageHeader';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/admin/Button';
import { StatusPill } from '@/components/admin/StatusPill';
import { TableSkeleton } from '@/components/admin/Skeleton';
import { Modal } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/Toast';
import { ORDER_STATUS_LABELS } from '@/lib/firestore/orders';
import { orderStatusTone } from '@/components/admin/StatusPill';
import { useAdminAuthStore } from '@/lib/store/useAdminAuthStore';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  user: 'User',
};

const ROLE_TONES: Record<UserRole, string> = {
  admin: 'green',
  user: 'gray',
};

/**
 * `staff` and `customer` were retired in favour of a plain admin/user split.
 * Documents written before that still carry the old values, so fold them into
 * `user` on read instead of letting them vanish from every filter.
 */
function normalizeRole(role: string | undefined): UserRole {
  return role === 'admin' ? 'admin' : 'user';
}

/** Welcome signups are keyed by contact and have no auth uid. */
function docKey(u: UserProfile): string {
  return u.id ?? u.uid ?? '';
}

export default function UsersPage() {
  const { data: users, loading } = useFirestoreCollection<UserProfile>(COLLECTIONS.users);
  const { data: orders } = useFirestoreCollection<Order>(COLLECTIONS.orders);
  const { pushSuccess, pushError } = useToast();
  const adminUser = useAdminAuthStore((s) => s.adminUser);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftRole, setDraftRole] = useState<UserRole>('user');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
        if (roleFilter !== 'all' && normalizeRole(u.role) !== roleFilter) return false;
        if (!q) return true;
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.welcomeCode?.toLowerCase().includes(q) ||
          (u.uid ?? '').toLowerCase().includes(q) ||
          docKey(u).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [users, search, roleFilter]);

  const setRole = async (u: UserProfile, role: UserRole) => {
    const key = docKey(u);
    if (!key) {
      pushError('Could not update role', 'This record has no document id.');
      return;
    }
    // Demoting the signed-in admin would revoke their own access mid-session:
    // `isAdmin()` is what every Firestore rule checks, so they would be locked
    // out of the panel entirely and could not undo it from the UI.
    if (normalizeRole(u.role) === 'admin' && role !== 'admin' && key === docKey(adminUser ?? {} as UserProfile)) {
      pushError(
        'Cannot demote yourself',
        'Ask another admin to change your role, otherwise you will lose access to this panel.'
      );
      return;
    }
    const result = await updateDocById(COLLECTIONS.users, key, { role });
    if (result.error) pushError('Could not update role', result.error);
    else pushSuccess('Role updated', `${u.name} is now ${ROLE_LABELS[role]}`);
  };

  const setStatus = async (u: UserProfile, status: UserStatus) => {
    const key = docKey(u);
    if (!key) {
      pushError('Could not update status', 'This record has no document id.');
      return;
    }
    const result = await updateDocById(COLLECTIONS.users, key, { status });
    if (result.error) {
      pushError('Could not update status', result.error);
    } else {
      pushSuccess(
        status === 'active' ? 'Account enabled' : 'Account disabled',
        u.email || u.phone || key
      );
      setActiveUser((a) => (a && docKey(a) === key ? { ...a, status } : a));
    }
  };

  /**
   * Records created here are keyed by phone number, while a real storefront
   * account is keyed by its auth uid. When the same person later signs up, the
   * `/users` rules stop their browser from claiming this document, so the two
   * coexist. Collect the phone of every account-backed record so a pre-created
   * one can be shown as already linked instead of looking like a stranger.
   */
  const accountPhones = useMemo(() => {
    const set = new Set<string>();
    for (const u of users) {
      if (!u.uid) continue;
      const p = normalizeContact(u.phone ?? u.email ?? '');
      if (p) set.add(p);
    }
    return set;
  }, [users]);

  /**
   * Creates a customer profile keyed by phone number.
   *
   * This deliberately does NOT create a sign-in credential. The browser SDK
   * cannot mint an auth user for somebody else, so the person still has to
   * register on the storefront with this exact number before they can sign in.
   * There is therefore no password field here: nothing would be able to store
   * it safely, and a stored password would be a liability.
   */
  const createProfile = async () => {
    setDraftError(null);
    const normalized = normalizeContact(draftPhone);
    if (!normalized) {
      setDraftError('Enter a valid Pakistani mobile number, e.g. 0300 1234567.');
      return;
    }
    if (!draftName.trim()) {
      setDraftError('Enter the person’s name.');
      return;
    }
    if (users.some((u) => normalizeContact(u.phone ?? '') === normalized)) {
      setDraftError('A record already exists for that phone number.');
      return;
    }

    setCreating(true);
    const result = await createDoc(
      COLLECTIONS.users,
      {
        name: draftName.trim(),
        phone: normalized,
        role: draftRole,
        status: 'active',
        source: 'admin-created',
        addresses: [],
      },
      normalized
    );
    setCreating(false);

    if (result.error) {
      pushError('Could not create profile', result.error);
      return;
    }
    pushSuccess(
      'Profile created',
      `${draftName.trim()} can now register with ${formatContact(normalized)}.`
    );
    setDraftName('');
    setDraftPhone('');
    setDraftRole('user');
    setIsCreateOpen(false);
  };

  const userOrders = activeUser
    ? orders.filter((o) => o.userId && o.userId === docKey(activeUser))
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        subtitle={`${users.length} people — accounts and welcome signups`}
        action={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add person
          </Button>
        }
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
            {(['all', 'admin', 'user'] as const).map((r) => (
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
              message="Accounts created on the store and welcome-code signups appear here."
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
                  const s = stats.get(docKey(u));
                  const role = normalizeRole(u.role);
                  const isWelcome = u.source === 'welcome-popup' || !u.uid;
                  const isPreCreated = u.source === 'admin-created' && !u.uid;
                  const isLinked = isPreCreated && accountPhones.has(normalizeContact(u.phone ?? '') ?? '');
                  return (
                    <tr key={docKey(u)} className="border-b border-[#e5ece3] last:border-0 hover:bg-[#fafbfa]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.photoURL} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf0e7] text-sm font-bold text-[#14402a]">
                              {(u.name || u.phone || '?').slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="font-medium text-[#172b21]">{u.name || 'Guest signup'}</p>
                            <p className="text-xs text-[#aabcb0]">
                              {u.phone ? formatContact(u.phone) : u.email || docKey(u)}
                            </p>
                            {isWelcome && u.welcomeCode ? (
                              <p className="mt-0.5 font-mono text-[11px] text-[#b85b2e]">
                                {u.welcomeCode}
                              </p>
                            ) : null}
                            {isPreCreated ? (
                              <p className="mt-0.5 text-[11px] text-[#52685a]">
                                {isLinked
                                  ? 'Registered — account exists'
                                  : 'Pre-created — not signed up yet'}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill label={ROLE_LABELS[role]} tone={ROLE_TONES[role]} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          label={u.status === 'disabled' ? 'Disabled' : 'Active'}
                          tone={u.status === 'disabled' ? 'red' : 'green'}
                          dot
                        />
                      </td>
                      <td className="px-4 py-3 text-[#52685a]">{formatDate(u.createdAt ?? '')}</td>
                      <td className="px-4 py-3 text-[#52685a]">{s?.count ?? 0}</td>
                      <td className="px-4 py-3 font-semibold text-[#172b21]">{formatPKR(s?.total ?? 0)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <SelectRole value={role} onChange={(next) => setRole(u, next)} />
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
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add person"
        description="Pre-create a customer profile keyed by phone number."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createProfile} loading={creating}>
              Create profile
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {draftError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {draftError}
            </p>
          ) : null}

          <div>
            <label htmlFor="new-name" className="block text-sm font-medium text-[#172b21]">
              Full name
            </label>
            <input
              id="new-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Hamza Khan"
              className="mt-1 h-11 w-full rounded-xl border border-[#e5ece3] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
            />
          </div>

          <div>
            <label htmlFor="new-phone" className="block text-sm font-medium text-[#172b21]">
              Phone number
            </label>
            <div className="relative mt-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aabcb0]" />
              <input
                id="new-phone"
                type="tel"
                inputMode="tel"
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                placeholder="0300 1234567"
                className="h-11 w-full rounded-xl border border-[#e5ece3] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
              />
            </div>
            <p className="mt-1 text-xs text-[#52685a]">
              Store sign-ups are keyed by phone number, so this is how the person will sign in.
            </p>
          </div>

          <div>
            <label htmlFor="new-role" className="block text-sm font-medium text-[#172b21]">
              Role
            </label>
            <select
              id="new-role"
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value as UserRole)}
              className="mt-1 h-11 w-full rounded-xl border border-[#e5ece3] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <p className="rounded-xl border border-[#cfe0cc] bg-[#f4f7f2] px-3 py-2.5 text-xs text-[#52685a]">
            This creates a profile record only — there is no password field on purpose. A browser
            cannot create a sign-in credential for somebody else, and the person must register on
            the storefront with this number before they can actually log in. They will appear here a
            second time as an account once they do.
          </p>
        </div>
      </Modal>

      <Modal
        open={!!activeUser}
        onClose={() => setActiveUser(null)}
        title={activeUser?.name ?? 'User'}
        description={activeUser?.phone ? formatContact(activeUser.phone) : activeUser?.email}
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
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Contact</p>
                <p className="mt-1 font-medium text-[#172b21]">{activeUser.name || 'Guest signup'}</p>
                <p className="text-[#52685a]">{activeUser.email || 'No email'}</p>
                <p className="font-mono text-[#52685a]">
                  {activeUser.phone || activeUser.uid || docKey(activeUser)}
                </p>
                <p className="mt-1 text-[#52685a]">Joined {formatDate(activeUser.createdAt ?? '')}</p>
                {activeUser.welcomeCode ? (
                  <p className="mt-1 font-mono text-[#b85b2e]">
                    Welcome code {activeUser.welcomeCode}
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-[#e5ece3] p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-[#aabcb0]">Access</p>
                <p className="mt-1">
                  <StatusPill
                    label={ROLE_LABELS[normalizeRole(activeUser.role)]}
                    tone={ROLE_TONES[normalizeRole(activeUser.role)]}
                  />
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
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>
  );
}