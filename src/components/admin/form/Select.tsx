'use client';

import { SelectHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, hint, error, children, className, id, ...props }: SelectProps) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#172b21]">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={inputId}
          className={cn(
            'h-10 w-full appearance-none rounded-xl border bg-white px-3 pr-9 text-sm text-[#172b21] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14402a]/30',
            error ? 'border-red-300' : 'border-[#e5ece3] hover:border-[#cfe0cc]',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52685a]" />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-[#52685a]">{hint}</p> : null}
    </div>
  );
}