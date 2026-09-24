'use client';

import { useEffect } from 'react';
import { useAdminAuthStore } from '@/lib/store/useAdminAuthStore';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const init = useAdminAuthStore((s) => s.init);
  const adminUser = useAdminAuthStore((s) => s.adminUser);
  const isAdmin = useAdminAuthStore((s) => s.isAdmin);
  const isAuthReady = useAdminAuthStore((s) => s.isAuthReady);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!isAuthReady) return;
    const onLoginPage = pathname === '/admin/login';
    if (onLoginPage && isAdmin && adminUser) {
      router.replace('/admin/dashboard');
    }
    if (!onLoginPage && !adminUser) {
      router.replace('/admin/login');
    }
  }, [isAuthReady, isAdmin, adminUser, pathname, router]);

  return <>{children}</>;
}