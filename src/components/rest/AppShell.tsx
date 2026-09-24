import { HeartHandshake, Sprout, Sunrise } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { LoginArea } from '@/components/auth/LoginArea';
import { useNow } from '@/hooks/useNow';
import { useRest } from '@/hooks/useRest';
import { ENERGY_LEVELS, recentCheckin } from '@/lib/rest';
import { cn } from '@/lib/utils';

import { BatteryGlyph } from './BatteryControl';
import { RestGlyph } from './RestGlyph';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { to: '/', label: 'Today', icon: Sunrise, end: true },
  { to: '/journey', label: 'Journey', icon: Sprout, end: false },
  { to: '/circle', label: 'Circle', icon: HeartHandshake, end: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-ember text-primary-foreground shadow-sm">
              <RestGlyph className="size-6" aria-hidden />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight">Restful</span>
          </Link>

          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <BatteryIndicator />
            <ThemeToggle />
            <LoginArea className="max-w-48" />
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 pb-28 md:pb-12">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-lg md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-6" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Your latest battery reading, always one tap from checking in again. */
function BatteryIndicator() {
  const now = useNow();
  const { state } = useRest();
  const current = recentCheckin(state.checkins, now);
  const label = current ? ENERGY_LEVELS[current.level - 1].short : 'Check in';

  return (
    <Link
      to="/"
      aria-label={current ? `Battery: ${ENERGY_LEVELS[current.level - 1].label}. Check in again` : 'Check your battery'}
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-secondary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        current ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <BatteryGlyph level={current?.level} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
