'use client';

import { cn } from '@/lib/utils';

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-3 text-left"
    >
      {(label || description) && (
        <span>
          {label ? <span className="block text-sm font-medium text-[#172b21]">{label}</span> : null}
          {description ? (
            <span className="mt-0.5 block text-xs text-[#52685a]">{description}</span>
          ) : null}
        </span>
      )}
      <span
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-[#14402a]' : 'bg-[#d4e0d2]'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </span>
    </button>
  );
}