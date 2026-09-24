'use client';

import { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
}

export function TextInput({ label, hint, error, leading, className, id, ...props }: TextInputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#172b21]">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#52685a]">
            {leading}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xl border bg-white px-3 text-sm text-[#172b21] placeholder:text-[#aabcb0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14402a]/30',
            leading ? 'pl-9' : undefined,
            error ? 'border-red-300' : 'border-[#e5ece3] hover:border-[#cfe0cc]',
            className
          )}
          {...props}
        />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-[#52685a]">{hint}</p> : null}
    </div>
  );
}