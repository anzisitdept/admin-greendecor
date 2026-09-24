'use client';

import { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RepeatableFieldProps<T> {
  label?: string;
  items: T[];
  onChange: (items: T[]) => void;
  onCreate: () => T;
  renderItem: (item: T, update: (next: T) => void, index: number) => ReactNode;
  addLabel: string;
  itemClassName?: string;
}

export function RepeatableField<T>({
  label,
  items,
  onChange,
  onCreate,
  renderItem,
  addLabel,
  itemClassName,
}: RepeatableFieldProps<T>) {
  return (
    <div className="space-y-2">
      {label ? <span className="block text-sm font-medium text-[#172b21]">{label}</span> : null}
      {items.map((item, index) => (
        <div key={index} className={cn('group relative rounded-xl border border-[#e5ece3] bg-[#fafbfa] p-3', itemClassName)}>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="absolute right-2 top-2 rounded-full p-1.5 text-[#aabcb0] transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label={`Remove item ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {renderItem(
            item,
            (next) => onChange(items.map((it, i) => (i === index ? next : it))),
            index
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, onCreate()])}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#cfe0cc] bg-white px-3 py-2 text-sm font-medium text-[#14402a] hover:bg-[#eaf0e7]"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  );
}