import { clsx } from 'clsx';

export function DashboardSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <span className="sr-only">Loading dashboard...</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className={clsx('grid gap-4 sm:grid-cols-2', cards === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3')}>
          {Array.from({ length: cards }, (_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between"><div className="h-4 w-32 rounded bg-slate-200" /><div className="h-10 w-10 rounded-lg bg-slate-100" /></div>
              <div className="mt-4 h-9 w-20 rounded bg-slate-200" /><div className="mt-2 h-5 w-36 rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="h-6 w-40 rounded bg-slate-200" />
          {[0, 1, 2, 3].map((row) => <div key={row} className="h-10 rounded bg-slate-100" />)}
        </div>
      </div>
    </div>
  );
}
