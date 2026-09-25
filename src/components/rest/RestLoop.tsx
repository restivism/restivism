import { ArrowUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { BatteryGlyph } from './BatteryControl';
import { ChargingBattery } from './ChargingBattery';

interface Step {
  n: number;
  title: string;
  body: string;
  visual: ReactNode;
  tint: string;
}

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Check in',
    body: 'Tap how charged you feel, or say it out loud. Nobody else sees it.',
    visual: <BatteryGlyph level={2} size="md" className="w-16 text-foreground/80 sm:w-20" />,
    tint: 'from-rose-400/20 via-orange-300/10 to-transparent',
  },
  {
    n: 2,
    title: 'Recharge',
    body: 'Get a plan of play, sleep, or social time, and a timer that charges you back up.',
    visual: <ChargingBattery recharge="sleep" value={0.6} onLight className="aspect-[160/280] h-20 sm:h-28" />,
    tint: 'from-indigo-400/25 via-violet-300/10 to-transparent',
  },
  {
    n: 3,
    title: 'Guard it together',
    body: 'Your organization promises to protect rest: someone covers the work, or it waits.',
    visual: (
      <img
        src="/team.webp"
        alt=""
        loading="lazy"
        className="size-20 rounded-xl sm:h-28 sm:w-40 object-cover object-[center_65%] shadow-md"
      />
    ),
    tint: 'from-emerald-400/20 via-amber-300/10 to-transparent',
  },
];

/** Bring the battery check-in into view and put focus on it. */
function focusBattery() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('battery-heading')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  document.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus({ preventScroll: true });
}

/** Shown before the first reading: why rest matters to movements, and how the loop works. */
export function RestLoop() {
  return (
    <section
      aria-labelledby="loop-heading"
      className="space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-10 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700"
    >
      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-widest text-ember-foreground">Rest is resistance</p>
        <h2 id="loop-heading" className="text-4xl font-semibold leading-tight sm:text-5xl">
          Burnout is how movements lose. <span className="text-primary">Rest is how they last.</span>
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Organizers give until they are empty, and then they leave. Restivist makes rest part of the work, for you and for the people you organize with.
        </p>
      </div>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.n}
            className="relative isolate flex items-center gap-4 overflow-hidden rounded-2xl border p-4 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700"
            style={{ animationDelay: `${150 + i * 150}ms`, animationFillMode: 'both' }}
          >
            <span className={cn('absolute inset-0 -z-10 bg-gradient-to-b', step.tint)} aria-hidden />
            <div className="grid w-20 shrink-0 place-items-center sm:h-32 sm:w-auto" aria-hidden>{step.visual}</div>
            <div className="sm:mt-4">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Step {step.n}</p>
              <h3 className="text-2xl font-semibold">{step.title}</h3>
              <p className="mt-1 text-base leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={focusBattery}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowUp className="size-5 motion-safe:animate-float" aria-hidden />
          Start with your battery
        </button>
      </div>
    </section>
  );
}
