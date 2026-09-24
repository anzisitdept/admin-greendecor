import { ReactNode } from 'react';
import { Link2 } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-[#172b21]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[#52685a]">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d4e0d2] bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf0e7] text-[#14402a]">
        {icon ?? <Link2 className="h-6 w-6" />}
      </div>
      <h3 className="font-serif text-lg text-[#172b21]">{title}</h3>
      {message ? <p className="mt-1 max-w-sm text-sm text-[#52685a]">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}