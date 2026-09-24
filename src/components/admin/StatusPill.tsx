import { cn } from '@/lib/utils';

const TONES: Record<string, string> = {
  green: 'bg-[#eaf0e7] text-[#14402a] border-[#cedcc9]',
  terracotta: 'bg-[#fdf0e8] text-[#b85b2e] border-[#f2d3c0]',
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  gray: 'bg-[#f4f7f2] text-[#52685a] border-[#e5ece3]',
};

export function StatusPill({
  label,
  tone = 'gray',
  dot,
  className,
}: {
  label: string;
  tone?: keyof typeof TONES | string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone] ?? TONES.gray,
        className
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {label}
    </span>
  );
}

export function orderStatusTone(status: string): string {
  switch (status) {
    case 'placed':
      return 'blue';
    case 'confirmed':
      return 'violet';
    case 'processing':
      return 'amber';
    case 'shipped':
      return 'terracotta';
    case 'delivered':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'gray';
  }
}

export function paymentStatusTone(status: string): string {
  switch (status) {
    case 'paid':
      return 'green';
    case 'pending':
      return 'amber';
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
}

export function serviceRequestTone(status: string): string {
  switch (status) {
    case 'new':
      return 'blue';
    case 'contacted':
      return 'amber';
    case 'consultation_scheduled':
      return 'violet';
    case 'completed':
      return 'green';
    default:
      return 'gray';
  }
}