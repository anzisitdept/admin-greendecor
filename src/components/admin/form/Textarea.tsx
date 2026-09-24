'use client';

import { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  rows?: number;
}

export function Textarea({ label, hint, error, rows = 4, className, id, ...props }: TextareaProps) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#172b21]">
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-[#172b21] placeholder:text-[#aabcb0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14402a]/30',
          error ? 'border-red-300' : 'border-[#e5ece3] hover:border-[#cfe0cc]',
          className
        )}
        {...props}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-[#52685a]">{hint}</p> : null}
    </div>
  );
}