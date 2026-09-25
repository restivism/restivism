import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { RestivismMark } from './RestivismMark';

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
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RestivismMark className="h-8 w-auto shrink-0" aria-hidden />
            <span className="truncate font-display text-2xl font-semibold tracking-tight">Restivism</span>
          </Link>

          <nav className="ml-auto flex items-center rounded-full border bg-card/80 p-1 text-sm font-bold" aria-label="Primary">
            <NavLink
              to="/"
              end
              className={({ isActive }) => cn(
                'rounded-full px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              My rest
            </NavLink>
            <NavLink
              to="/team"
              className={({ isActive }) => cn(
                'rounded-full px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Organization
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1 pb-16">
        {children}
      </main>
    </div>
  );
}
