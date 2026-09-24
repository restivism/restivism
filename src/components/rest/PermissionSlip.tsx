import { affirmationForDay, dayKey } from '@/lib/rest';

export function PermissionSlip({ now }: { now: number }) {
  const { text, cite } = affirmationForDay(dayKey(now));

  return (
    <figure className="relative h-full overflow-hidden rounded-2xl border border-dashed border-ember/50 bg-accent/40 p-6 sm:p-8">
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-ember-foreground">Permission slip</p>
      <blockquote className="font-display text-2xl leading-snug text-foreground sm:text-3xl">
        &ldquo;{text}&rdquo;
      </blockquote>
      {cite && <figcaption className="mt-4 text-base text-muted-foreground">&mdash; {cite}</figcaption>}
      <p className="mt-6 text-base text-muted-foreground">
        This slip excuses the bearer from productivity for as long as they need.
      </p>
    </figure>
  );
}
