import { Flame } from 'lucide-react';

import type { SessionResult } from '@/contexts/RestContext';
import { cn } from '@/lib/utils';

import { MoonPhase } from './MoonPhase';

export function RewardSummary({ result, className }: { result: SessionResult; className?: string }) {
  const { session, lines, earned, levelUp } = result;

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-center justify-center gap-3 motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-700">
        <Flame className="size-10 text-ember motion-safe:animate-float" aria-hidden />
        <p className="font-display text-5xl font-semibold tabular-nums">
          +{session.embers}
          <span className="ml-2 text-2xl font-normal text-muted-foreground">embers</span>
        </p>
      </div>

      <ul className="space-y-1.5 rounded-xl bg-muted/50 p-4 text-base">
        {lines.map((line, i) => (
          <li
            key={line.label}
            className="flex justify-between gap-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both"
            style={{ animationDelay: `${300 + i * 120}ms` }}
          >
            <span>{line.label}</span>
            <span className="font-semibold tabular-nums text-ember-foreground">+{line.amount}</span>
          </li>
        ))}
      </ul>

      {levelUp && (
        <div className="flex items-center gap-4 rounded-xl border border-moon/50 bg-moon/10 p-4">
          <MoonPhase phase={levelUp.phase} glow={Math.max(0, levelUp.index - 3)} className="size-14 shrink-0" />
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">New phase</p>
            <p className="font-display text-2xl font-semibold">{levelUp.name}</p>
            <p className="text-base text-muted-foreground">{levelUp.blurb}</p>
          </div>
        </div>
      )}

      {earned.map((badge) => {
        const Icon = badge.icon;
        return (
          <div key={badge.id} className="flex items-center gap-4 rounded-xl border border-ember/40 bg-accent/60 p-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ember to-primary text-white shadow-md">
              <Icon className="size-7" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-ember-foreground">Badge earned</p>
              <p className="font-display text-2xl font-semibold">{badge.name}</p>
              <p className="text-base text-muted-foreground">{badge.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
