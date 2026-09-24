'use client';

import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  step?: number;
}

export function NumberInput({
  label,
  hint,
  error,
  prefix,
  className,
  id,
  step = 1,
  ...props
}: NumberInputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#172b21]">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-[#52685a]">
            {prefix}
          </span>
        ) : null}
        <input
          id={inputId}
          type="number"
          step={step}
          className={cn(
            'h-10 w-full rounded-xl border bg-white px-3 text-sm text-[#172b21] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14402a]/30',
            prefix && 'pl-10',
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