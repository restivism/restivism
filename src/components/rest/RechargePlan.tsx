import { ArrowRight, ArrowUp, PencilLine } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { ENERGY_LEVELS, getPractice, LEVEL_TEXT, RECHARGE_PLANS, type RechargePick } from '@/lib/rest';
import { cn } from '@/lib/utils';

import { BatteryGlyph } from './BatteryControl';
import { LogRestDialog } from './LogRestDialog';

export function RechargePlan({ level }: { level?: number }) {
  if (!level) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center backdrop-blur">
        <ArrowUp className="size-6 text-muted-foreground motion-safe:animate-float" aria-hidden />
        <h2 className="text-2xl font-semibold">Your recharge plan starts with your battery.</h2>
        <p className="max-w-md text-base text-muted-foreground">
          Tap the battery that matches how you feel right now. We will tell you what kind of rest you need, and how much.
        </p>
      </section>
    );
  }

  const plan = RECHARGE_PLANS[level];
  const [featured, ...rest] = plan.picks;
  const urgent = level <= 2;

  return (
    <section
      aria-labelledby="plan-heading"
      className={cn(
        'space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-8',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500',
        urgent && 'border-rose-500/40',
      )}
    >
      <div className="space-y-2">
        <p className={cn('flex items-center gap-2 text-sm font-bold uppercase tracking-widest', LEVEL_TEXT[level])}>
          <BatteryGlyph level={level} />
          Recharge plan &middot; {ENERGY_LEVELS[level - 1].short}
        </p>
        <h2 id="plan-heading" className="text-3xl font-semibold leading-tight sm:text-4xl">
          {plan.headline}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{plan.body}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <PickCard pick={featured} featured className="md:col-span-3" />
        <div className="grid gap-3 sm:grid-cols-2 md:col-span-2 md:grid-cols-1">
          {rest.map((pick) => (
            <PickCard key={pick.practice} pick={pick} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-base text-muted-foreground">Recharged some other way?</p>
        <LogRestDialog>
          <Button variant="ghost" className="rounded-full text-base">
            <PencilLine className="size-4" aria-hidden />
            Log a rest
          </Button>
        </LogRestDialog>
      </div>
    </section>
  );
}

function PickCard({ pick, featured, className }: { pick: RechargePick; featured?: boolean; className?: string }) {
  const practice = getPractice(pick.practice);
  if (!practice) return null;
  const Icon = practice.icon;

  return (
    <Link
      to={`/rest/${practice.id}?m=${pick.minutes}`}
      className={cn(
        'group relative isolate flex overflow-hidden rounded-2xl border transition-all',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0',
        featured ? 'min-h-56 flex-col justify-between gap-6 p-6' : 'items-center gap-4 p-4',
        className,
      )}
    >
      <span
        className={cn('absolute inset-0 -z-10 bg-gradient-to-br transition-opacity', practice.gradient, featured ? 'opacity-100' : 'opacity-50 group-hover:opacity-90')}
        aria-hidden
      />
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-xl bg-background/75 text-primary shadow-sm backdrop-blur',
          featured ? 'size-14' : 'size-11',
        )}
      >
        <Icon className={featured ? 'size-7' : 'size-6'} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        {featured && <span className="block text-sm font-bold uppercase tracking-widest text-foreground/70">Start here</span>}
        <span className={cn('block font-display font-semibold', featured ? 'text-3xl' : 'text-xl')}>
          {practice.name} &middot; {pick.minutes} min
        </span>
        <span className={cn('block leading-snug text-foreground/75', featured ? 'text-lg' : 'text-sm sm:text-base')}>{pick.why}</span>
      </span>
      {featured ? (
        <span className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors group-hover:bg-primary/90">
          Begin
          <ArrowRight className="size-4" aria-hidden />
        </span>
      ) : (
        <ArrowRight className="size-5 shrink-0 text-foreground/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
      )}
    </Link>
  );
}
