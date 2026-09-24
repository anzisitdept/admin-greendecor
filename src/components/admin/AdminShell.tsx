'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAdminAuthStore } from '@/lib/store/useAdminAuthStore';
import { Sidebar } from '@/components/admin/Sidebar';
import { Topbar } from '@/components/admin/Topbar';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { Button } from '@/components/admin/Button';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const adminUser = useAdminAuthStore((s) => s.adminUser);
  const isAdmin = useAdminAuthStore((s) => s.isAdmin);
  const isAuthReady = useAdminAuthStore((s) => s.isAuthReady);
  const logout = useAdminAuthStore((s) => s.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!adminUser) {
      router.replace('/admin/login');
    }
  }, [isAuthReady, adminUser, isAdmin, router]);

  if (!isAuthReady) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!isAdmin || !adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-[#e5ece3] bg-white p-8 text-center card-shadow">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl text-[#172b21]">Access denied</h1>
          <p className="mt-2 text-sm text-[#52685a]">
            {adminUser
              ? `Your account (${adminUser.email}) does not have admin privileges.`
              : 'You need admin privileges to view this panel.'}
          </p>
          <Button variant="outline" className="mt-6" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumb = pathname.split('/').filter(Boolean).pop() || 'dashboard';

  return (
    <div className="min-h-screen">
      <Sidebar
        user={adminUser}
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-64">
        <Topbar breadcrumb={breadcrumb} onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}