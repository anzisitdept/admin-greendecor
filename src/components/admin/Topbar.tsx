'use client';

import { Menu } from 'lucide-react';

export function Topbar({
  breadcrumb,
  onMenuClick,
}: {
  breadcrumb: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e5ece3] bg-white/85 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-[#52685a] hover:bg-[#f4f7f2] lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav className="flex items-center gap-1.5 text-sm">
          <span className="text-[#aabcb0]">Admin</span>
          <span className="text-[#aabcb0]">/</span>
          <span className="font-medium capitalize text-[#172b21]">{breadcrumb}</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[#e5ece3] bg-[#f4f7f2] px-3 py-1 text-xs font-medium text-[#52685a]">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#14402a]" />
            Live
          </span>
        </div>
      </div>
    </header>
  );
}