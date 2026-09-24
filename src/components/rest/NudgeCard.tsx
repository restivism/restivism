import { AlarmClock, ArrowRight, BatteryWarning, MoonStar } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { getPractice, type Nudge } from '@/lib/rest';
import { cn } from '@/lib/utils';

const TONE = {
  gentle: {
    icon: AlarmClock,
    className: 'border-primary/30 bg-secondary/70',
    iconClass: 'bg-primary/15 text-primary',
  },
  firm: {
    icon: MoonStar,
    className: 'border-ember/40 bg-accent/70',
    iconClass: 'bg-ember/20 text-ember-foreground',
  },
  urgent: {
    icon: BatteryWarning,
    className: 'border-rose-500/50 bg-rose-500/10',
    iconClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
  },
} as const;

export function NudgeCard({ nudge }: { nudge: Nudge }) {
  const tone = TONE[nudge.tone];
  const Icon = tone.icon;
  const practice = getPractice(nudge.practice);

  return (
    <section
      aria-live="polite"
      className={cn(
        'flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:p-6',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-500',
        tone.className,
      )}
    >
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-full', tone.iconClass)}>
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex-1 space-y-1">
        <h2 className="text-xl font-semibold sm:text-2xl">{nudge.title}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{nudge.body}</p>
      </div>
      <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
        <Link to={`/rest/${nudge.practice}?m=${nudge.minutes}`}>
          {practice?.name} for {nudge.minutes} min
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
