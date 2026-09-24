'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChipsInput({
  value,
  onChange,
  label,
  placeholder = 'Type and press Enter',
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const clean = draft.trim();
    if (!clean) return;
    if (value.some((v) => v.toLowerCase() === clean.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, clean]);
    setDraft('');
  };

  return (
    <div className={cn('space-y-1', className)}>
      {label ? <span className="block text-sm font-medium text-[#172b21]">{label}</span> : null}
      <div className="flex min-h-[40px] flex-wrap items-center gap-2 rounded-xl border border-[#e5ece3] bg-white p-2">
        {value.map((chip, idx) => (
          <span
            key={`${chip}-${idx}`}
            className="inline-flex items-center gap-1 rounded-full bg-[#eaf0e7] px-2.5 py-1 text-xs font-medium text-[#14402a]"
          >
            {chip}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== idx))}
              className="rounded-full hover:text-[#b85b2e]"
              aria-label={`Remove ${chip}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[140px] flex-1 bg-transparent px-1 text-sm text-[#172b21] placeholder:text-[#aabcb0] focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-full p-1 text-[#14402a] hover:bg-[#eaf0e7]"
          aria-label="Add tag"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}