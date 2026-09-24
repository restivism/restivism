import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Pause, Play, RotateCcw, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ProgressRing } from '@/components/rest/ProgressRing';
import { RewardSummary } from '@/components/rest/RewardSummary';
import { ShareToCircle } from '@/components/rest/ShareToCircle';
import { Button } from '@/components/ui/button';
import type { SessionResult } from '@/contexts/RestContext';
import { useRest } from '@/hooks/useRest';
import { playChime, primeAudio } from '@/lib/chime';
import { getPractice, type Practice } from '@/lib/rest';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

type Stage = 'setup' | 'running' | 'done';

const TIPS: Partial<Record<Practice['id'], string>> = {
  breathe: 'Sit or lie comfortably. Follow the circle: in as it grows, hold, and out slowly as it shrinks.',
  nap: 'Turn on Do Not Disturb and keep this screen open. We will wake you with a soft chime.',
  unplug: 'Start the timer, then turn your phone face down. Come back when you hear the chime.',
  wander: 'Pocket your phone. Leave the headphones. We will chime when it is time to head back.',
  nothing: 'Sit somewhere comfortable. There is no technique. That is the technique.',
  bodyscan: 'Lie down or sit back. We will guide your attention slowly from head to toe.',
};

export default function RestSession() {
  const { practiceId } = useParams();
  const practice = getPractice(practiceId);
  if (!practice?.guided) return <NotFound />;
  return <SessionFlow key={practice.id} practice={practice} />;
}

function SessionFlow({ practice }: { practice: Practice }) {
  const [params] = useSearchParams();
  const requested = Number(params.get('m'));
  const durations =
    Number.isInteger(requested) && requested > 0 && requested <= 180 && !practice.durations.includes(requested)
      ? [...practice.durations, requested].sort((a, b) => a - b)
      : practice.durations;
  const initial = durations.includes(requested) ? requested : practice.defaultDuration;

  const [stage, setStage] = useState<Stage>('setup');
  const [minutes, setMinutes] = useState(initial);
  const [result, setResult] = useState<SessionResult>();
  const { state, completeSession } = useRest();

  useSeoMeta({ title: `${practice.name} | Restful` });

  const finish = useCallback((rested: number) => {
    if (state.settings.chime) playChime();
    setResult(completeSession({ practice: practice.id, minutes: rested }));
    setStage('done');
  }, [completeSession, practice.id, state.settings.chime]);

  const Icon = practice.icon;

  return (
    <div className="dark relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
      <Backdrop practice={practice} />

      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" className="rounded-full text-base">
            <Link to="/">
              <ArrowLeft className="size-5" aria-hidden />
              {stage === 'done' ? 'Today' : 'Back'}
            </Link>
          </Button>
          <span className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
            <Icon className="size-5" aria-hidden />
            {practice.name}
          </span>
        </header>

        {stage === 'setup' && (
          <div className="flex flex-1 flex-col justify-center gap-10 py-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
            <div className="space-y-4 text-center">
              <span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/15 text-primary motion-safe:animate-float">
                <Icon className="size-10" aria-hidden />
              </span>
              <h1 className="text-5xl font-semibold tracking-tight">{practice.name}</h1>
              <p className="mx-auto max-w-md text-lg leading-relaxed text-muted-foreground">{TIPS[practice.id]}</p>
            </div>

            <fieldset>
              <legend className="mb-4 w-full text-center text-base font-semibold">How long?</legend>
              <div className="flex flex-wrap justify-center gap-3">
                {durations.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={minutes === d}
                    onClick={() => setMinutes(d)}
                    className={cn(
                      'min-w-24 rounded-2xl border px-5 py-4 text-center transition-all',
                      'hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      minutes === d ? 'border-primary bg-primary/15 shadow-sm' : 'border-border bg-card/40',
                    )}
                  >
                    <span className="block font-display text-3xl font-semibold tabular-nums">{d}</span>
                    <span className="text-sm text-muted-foreground">min</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <Button
              size="lg"
              className="mx-auto h-14 w-full max-w-xs rounded-full text-lg"
              onClick={() => {
                primeAudio();
                if (state.settings.chime) playChime(0.12);
                setStage('running');
              }}
            >
              Begin
            </Button>
          </div>
        )}

        {stage === 'running' && <Running practice={practice} minutes={minutes} onFinish={finish} />}

        {stage === 'done' && result && (
          <div className="flex flex-1 flex-col justify-center gap-8 py-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
            <div className="space-y-3 text-center">
              <h1 className="text-5xl font-semibold tracking-tight">Welcome back.</h1>
              <p className="text-lg text-muted-foreground">
                You rested for {result.session.minutes} minute{result.session.minutes === 1 ? '' : 's'}. That was an act of resistance.
              </p>
            </div>
            <RewardSummary result={result} />
            <ShareToCircle practice={practice} minutes={result.session.minutes} />
            <div className="grid grid-cols-2 gap-3">
              <Button asChild size="lg" className="h-12 rounded-full text-base">
                <Link to="/">Back to today</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full text-base"
                onClick={() => {
                  setResult(undefined);
                  setStage('setup');
                }}
              >
                <RotateCcw className="size-4" aria-hidden />
                Rest again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Backdrop({ practice }: { practice: Practice }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className={cn('absolute inset-0 bg-gradient-to-b opacity-60', practice.gradient)} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      {STARS.map(([x, y, s, d], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white motion-safe:animate-twinkle"
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${d}s` }}
        />
      ))}
    </div>
  );
}

// [left %, top %, size px, delay s]
const STARS: [number, number, number, number][] = [
  [8, 12, 2, 0], [22, 6, 1.5, 1.2], [35, 18, 2, 2.4], [51, 9, 1, 0.6], [64, 15, 2, 3.1],
  [77, 5, 1.5, 1.8], [89, 20, 2, 0.3], [14, 30, 1, 2.9], [70, 32, 1.5, 1.1], [93, 38, 1, 2.2],
  [4, 44, 1.5, 3.5], [45, 3, 1.5, 0.9],
];

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let cancelled = false;
    const request = () => {
      navigator.wakeLock.request('screen').then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      }).catch(() => {});
    };
    request();
    // Wake locks are released when the tab is hidden; take it back on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface RunningProps {
  practice: Practice;
  minutes: number;
  onFinish: (minutes: number) => void;
}

function Running({ practice, minutes, onFinish }: RunningProps) {
  const navigate = useNavigate();
  const totalMs = minutes * 60_000;
  // Wall-clock timing so the session stays accurate if the tab is backgrounded.
  const [timer, setTimer] = useState(() => ({ startedAt: Date.now(), pausedMs: 0, pausedAt: null as number | null }));
  const [now, setNow] = useState(() => Date.now());
  const finished = useRef(false);
  const { pausedAt } = timer;

  useWakeLock(pausedAt === null);

  const elapsed = Math.min(totalMs, now - timer.startedAt - timer.pausedMs - (pausedAt ? now - pausedAt : 0));
  const remaining = totalMs - elapsed;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining <= 0 && !finished.current) {
      finished.current = true;
      onFinish(minutes);
    }
  }, [remaining, minutes, onFinish]);

  const togglePause = () => {
    const t = Date.now();
    setTimer((prev) =>
      prev.pausedAt
        ? { ...prev, pausedMs: prev.pausedMs + t - prev.pausedAt, pausedAt: null }
        : { ...prev, pausedAt: t },
    );
    setNow(t);
  };

  const restedMinutes = Math.floor(elapsed / 60_000);
  const endEarly = () => {
    if (finished.current) return;
    finished.current = true;
    if (restedMinutes >= 1) onFinish(restedMinutes);
    else navigate('/');
  };

  let prompt: string | undefined;
  if (practice.prompts.length) {
    const i =
      practice.id === 'bodyscan'
        ? Math.min(practice.prompts.length - 1, Math.floor(elapsed / (totalMs / practice.prompts.length)))
        : Math.floor(elapsed / 30_000) % practice.prompts.length;
    prompt = practice.prompts[i];
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 py-10">
      {practice.id === 'breathe' ? (
        <BreathingOrb elapsed={elapsed} paused={pausedAt !== null} remaining={remaining} />
      ) : (
        <ProgressRing
          value={elapsed / totalMs}
          size={260}
          stroke={8}
          trackClassName="stroke-white/10"
          barClassName="stroke-primary"
          label="Session progress"
        >
          <div>
            <p className="font-display text-6xl font-light tabular-nums" aria-live="off">{formatClock(remaining)}</p>
            <p className="mt-1 text-base text-muted-foreground">{pausedAt ? 'Paused' : 'remaining'}</p>
          </div>
        </ProgressRing>
      )}

      {prompt && (
        <p
          key={prompt}
          className="min-h-20 max-w-md text-center font-display text-2xl leading-snug motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000"
          aria-live="polite"
        >
          {prompt}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" size="lg" className="h-12 rounded-full px-6 text-base" onClick={togglePause}>
          {pausedAt ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          {pausedAt ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="ghost" size="lg" className="h-12 rounded-full px-6 text-base" onClick={endEarly}>
          <Square className="size-4" aria-hidden />
          {restedMinutes >= 1 ? `End (${restedMinutes} min)` : 'Leave'}
        </Button>
      </div>
    </div>
  );
}

const BREATH_CYCLE = 14; // 4 in, 4 hold, 6 out

function BreathingOrb({ elapsed, paused, remaining }: { elapsed: number; paused: boolean; remaining: number }) {
  const t = (elapsed / 1000) % BREATH_CYCLE;
  let label: string;
  let count: number;
  if (t < 4) {
    label = 'Breathe in';
    count = Math.ceil(4 - t);
  } else if (t < 8) {
    label = 'Hold';
    count = Math.ceil(8 - t);
  } else {
    label = 'Breathe out';
    count = Math.ceil(BREATH_CYCLE - t);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative grid size-72 place-items-center">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/60 via-sky-400/40 to-ember/40 blur-md motion-safe:animate-breathe"
          style={{ animationPlayState: paused ? 'paused' : 'running' }}
          aria-hidden
        />
        <div
          className="absolute inset-6 rounded-full border border-white/20 bg-white/5 motion-safe:animate-breathe"
          style={{ animationPlayState: paused ? 'paused' : 'running' }}
          aria-hidden
        />
        <div className="relative text-center" aria-live="polite">
          <p className="font-display text-3xl font-semibold">{paused ? 'Paused' : label}</p>
          {!paused && <p className="mt-1 text-2xl tabular-nums text-foreground/80" aria-hidden>{count}</p>}
        </div>
      </div>
      <p className="text-base tabular-nums text-muted-foreground">{formatClock(remaining)} remaining</p>
    </div>
  );
}
