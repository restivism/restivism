import { ArrowRight, ArrowUp, Check, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useRest } from '@/hooks/useRest';
import { dayKey, ENERGY_LEVELS, type EnergyCheckin, getRecharge, LEVEL_TEXT, RECHARGE_PLANS, type RechargePick } from '@/lib/rest';
import { cn } from '@/lib/utils';

import { BatteryGlyph } from './BatteryControl';

/** What your battery reading means you should do next: one recharge, then small acts of care. */
export function RechargePlan({ checkin }: { checkin?: EnergyCheckin }) {
  const { state, toggleQuest, completeSession } = useRest();

  if (!checkin) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center backdrop-blur">
        <ArrowUp className="size-6 text-muted-foreground motion-safe:animate-float" aria-hidden />
        <h2 className="text-2xl font-semibold">Your plan starts with your battery.</h2>
        <p className="max-w-md text-base text-muted-foreground">
          Tap the battery that matches how you feel right now. We will tell you how to recharge: play time, sleep time, or social time.
        </p>
      </section>
    );
  }

  const { level } = checkin;
  const plan = RECHARGE_PLANS[level];
  const doneToday = state.quests[dayKey(checkin.at)] ?? [];
  const recharged = state.sessions.find((s) => s.endedAt >= checkin.at);
  const steps = plan.quests.length + 1;
  const done = (recharged ? 1 : 0) + plan.quests.filter((q) => doneToday.includes(q.id)).length;

  return (
    <section
      aria-labelledby="plan-heading"
      className={cn(
        'space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-8',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500',
        level <= 2 && 'border-rose-500/40',
      )}
    >
      <div className="space-y-2">
        <p className={cn('flex items-center gap-2 text-sm font-bold uppercase tracking-widest', LEVEL_TEXT[level])}>
          <BatteryGlyph level={level} />
          Your plan &middot; {ENERGY_LEVELS[level - 1].short}
        </p>
        <h2 id="plan-heading" className="text-3xl font-semibold leading-tight sm:text-4xl">
          {plan.headline}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{plan.body}</p>
      </div>

      {level <= 3 && (
        <Link
          to="/team?focus=coverage"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-secondary/60 p-4 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>
            <span className="block font-semibold">Need your team to make room for this rest?</span>
            <span className="block text-base text-muted-foreground">
              Plan coverage or pause nonessential work instead of pushing through.
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}

      <ol className="space-y-3">
        <li>
          <RechargeStep
            pick={plan.recharge}
            alternatives={plan.alternatives}
            doneAs={recharged ? getRecharge(recharged.practice)?.name ?? 'Rest' : undefined}
            onMarkDone={() => completeSession({ practice: plan.recharge.recharge, minutes: plan.recharge.minutes })}
          />
        </li>
        {plan.quests.map((q, i) => {
          const checked = doneToday.includes(q.id);
          return (
            <li key={q.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggleQuest(q.id)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left text-base transition-colors',
                  'hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  checked && 'border-ember/40 bg-accent/60',
                )}
              >
                <StepMark n={i + 2} done={checked} />
                <span className={cn('flex-1', checked && 'text-muted-foreground line-through decoration-ember/60')}>{q.text}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="border-t pt-4 text-base text-muted-foreground" aria-live="polite">
        {done === steps
          ? 'Plan complete. Check in again whenever your battery changes.'
          : `${done} of ${steps} done. Check in again whenever your battery changes, and your plan will follow.`}
      </p>
    </section>
  );
}

function StepMark({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition-colors',
        done ? 'border-ember bg-ember text-white' : 'border-muted-foreground/40 text-muted-foreground',
      )}
      aria-hidden
    >
      {done ? <Check className="size-4" strokeWidth={3} /> : n}
    </span>
  );
}

interface RechargeStepProps {
  pick: RechargePick;
  alternatives: RechargePick[];
  /** Name of the recharge taken since this reading, if any. */
  doneAs?: string;
  onMarkDone: () => void;
}

function RechargeStep({ pick, alternatives, doneAs, onMarkDone }: RechargeStepProps) {
  const recharge = getRecharge(pick.recharge);
  if (!recharge) return null;
  const Icon = recharge.icon;

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border p-5 sm:p-6">
      <span className={cn('absolute inset-0 -z-10 bg-gradient-to-br', recharge.gradient)} aria-hidden />

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <StepMark n={1} done={!!doneAs} />
          <p className="text-sm font-bold uppercase tracking-widest text-foreground/70">Recharge first</p>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-background/75 text-primary shadow-sm backdrop-blur sm:size-14">
              <Icon className="size-6 sm:size-7" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="font-display text-2xl font-semibold sm:text-3xl">
                {recharge.name} &middot; {pick.minutes} min
              </p>
              <p className="text-lg leading-snug text-foreground/80">{pick.why}</p>
            </div>
          </div>

          {doneAs ? (
            <p className="flex items-center gap-2 text-base font-semibold">
              <Check className="size-5 text-ember" aria-hidden />
              Recharged with {doneAs.toLowerCase()}.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/rest/${recharge.id}?m=${pick.minutes}`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Timer className="size-5" aria-hidden />
                Start the timer
              </Link>
              <button
                type="button"
                onClick={onMarkDone}
                className="h-12 rounded-full px-4 text-base font-semibold text-foreground/80 transition-colors hover:bg-background/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                I already did this
              </button>
            </div>
          )}

          {!doneAs && (
            <div className="space-y-2 border-t border-foreground/10 pt-4">
              <p className="text-sm font-semibold text-foreground/70">Not possible right now? Try instead:</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {alternatives.map((alt) => (
                  <li key={alt.recharge}>
                    <AlternativeLink pick={alt} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlternativeLink({ pick }: { pick: RechargePick }) {
  const recharge = getRecharge(pick.recharge);
  if (!recharge) return null;
  const Icon = recharge.icon;

  return (
    <Link
      to={`/rest/${recharge.id}?m=${pick.minutes}`}
      className="group flex h-full items-center gap-3 rounded-xl bg-background/60 p-3 backdrop-blur transition-colors hover:bg-background/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-5 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">
          {recharge.name} &middot; {pick.minutes} min
        </span>
        <span className="block text-sm leading-snug text-muted-foreground">{pick.why}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-foreground/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
