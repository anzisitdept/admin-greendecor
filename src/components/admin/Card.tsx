import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ className, padded = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white border border-[#e5ece3]',
        padded && 'p-5',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-serif text-lg text-[#172b21]">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-[#52685a]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}