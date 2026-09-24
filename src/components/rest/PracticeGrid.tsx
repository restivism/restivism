import { Link } from 'react-router-dom';

import { GUIDED_PRACTICES } from '@/lib/rest';
import { cn } from '@/lib/utils';

export function PracticeGrid() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {GUIDED_PRACTICES.map((p) => {
        const Icon = p.icon;
        return (
          <li key={p.id}>
            <Link
              to={`/rest/${p.id}`}
              className={cn(
                'group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all sm:p-5',
                'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'motion-reduce:hover:translate-y-0',
              )}
            >
              <span
                className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70 transition-opacity group-hover:opacity-100', p.gradient)}
                aria-hidden
              />
              <span className="relative grid size-11 place-items-center rounded-xl bg-background/70 text-primary shadow-sm backdrop-blur">
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="relative space-y-1">
                <span className="block font-display text-xl font-semibold">{p.name}</span>
                <span className="block text-sm leading-snug text-muted-foreground sm:text-base">{p.tagline}</span>
              </span>
              <span className="relative mt-auto text-sm font-semibold text-foreground/70">
                {p.durations.join(' / ')} min
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
