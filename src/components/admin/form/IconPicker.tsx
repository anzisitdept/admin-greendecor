'use client';

import { Leaf, Trees, Fish, Gift, Home, Sparkles, Flower2, Wrench, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, { label: string; node: React.ReactNode }> = {
  Leaf: { label: 'Leaf', node: <Leaf className="h-5 w-5" /> },
  Trees: { label: 'Trees', node: <Trees className="h-5 w-5" /> },
  Fish: { label: 'Fish', node: <Fish className="h-5 w-5" /> },
  Gift: { label: 'Gift', node: <Gift className="h-5 w-5" /> },
  Home: { label: 'Home', node: <Home className="h-5 w-5" /> },
  Sparkles: { label: 'Sparkles', node: <Sparkles className="h-5 w-5" /> },
  Flower2: { label: 'Flower', node: <Flower2 className="h-5 w-5" /> },
  Wrench: { label: 'Services', node: <Wrench className="h-5 w-5" /> },
  User: { label: 'User', node: <User className="h-5 w-5" /> },
};

export { ICONS };

export function IconView({ name, className }: { name: string; className?: string }) {
  const icon = ICONS[name];
  if (!icon) return <Leaf className={className} />;
  return <span className={cn('inline-flex', className)}>{icon.node}</span>;
}

export function IconPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (name: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label ? <span className="block text-sm font-medium text-[#172b21]">{label}</span> : null}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ICONS).map(([name, { label: iconLabel, node }]) => (
          <button
            type="button"
            key={name}
            onClick={() => onChange(name)}
            title={iconLabel}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl border transition-colors',
              value === name
                ? 'border-[#14402a] bg-[#14402a] text-white'
                : 'border-[#e5ece3] bg-white text-[#52685a] hover:border-[#14402a] hover:text-[#14402a]'
            )}
          >
            {node}
          </button>
        ))}
      </div>
    </div>
  );
}