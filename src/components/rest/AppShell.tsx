import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { RestGlyph } from './RestGlyph';

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
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-ember text-primary-foreground shadow-sm">
              <RestGlyph className="size-6" aria-hidden />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight">Restivism</span>
          </Link>
        </div>
      </header>

      <main id="main" className="flex-1 pb-16">
        {children}
      </main>
    </div>
  );
}
