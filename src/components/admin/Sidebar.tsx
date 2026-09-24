'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Leaf,
  ClipboardList,
  Star,
  MessageSquareQuote,
  Megaphone,
  Ticket,
  FileText,
  Users,
  Settings,
  LogOut,
  Leaf as LogoIcon,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/types';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/services', label: 'Services', icon: Leaf },
  { href: '/admin/quotes', label: 'Service Quotes', icon: ClipboardList },
  { href: '/admin/testimonials', label: 'Testimonials', icon: Star },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote },
  { href: '/admin/promos', label: 'Promos & Banners', icon: Megaphone },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/site-content', label: 'Site Content', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: Users },
];

export function Sidebar({
  user,
  onLogout,
  open,
  onClose,
}: {
  user: UserProfile | null;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-[#0d2b1c]/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#14402a] transition-transform',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
              <LogoIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-serif text-lg text-white leading-tight">Green Decor</span>
              <span className="text-[10px] uppercase tracking-widest text-white/50">Admin Panel</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/65 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/admin/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              pathname.startsWith('/admin/settings')
                ? 'bg-white/15 text-white'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            )}
          >
            <Settings className="h-4.5 w-4.5 shrink-0" />
            Settings
          </Link>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d47343] text-xs font-bold text-white">
              {(user?.name || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.name || 'Admin'}</p>
              <p className="truncate text-[10px] text-white/50">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}