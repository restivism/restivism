import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ChargingBattery } from '@/components/rest/ChargingBattery';
import { RechargeCheckin } from '@/components/rest/RechargeCheckin';
import { RestScene } from '@/components/rest/RestScene';
import { Button } from '@/components/ui/button';
import { useRest } from '@/hooks/useRest';
import { type Ambient, startAmbient } from '@/lib/ambient';
import { playChime, primeAudio } from '@/lib/chime';
import { getRecharge, type Recharge, type RestSession as Session } from '@/lib/rest';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

/** `?demo` runs a minute every second, for showing the whole loop live. */
const DEMO_SPEED = 60;

type Stage = 'setup' | 'running' | 'done';

export default function RestSession() {
  const { practiceId } = useParams();
  const recharge = getRecharge(practiceId);
  if (!recharge) return <NotFound />;
  return <SessionFlow key={recharge.id} recharge={recharge} />;
}

function SessionFlow({ recharge }: { recharge: Recharge }) {
  const [params] = useSearchParams();
  const requested = Number(params.get('m'));
  const durations =
    Number.isInteger(requested) && requested > 0 && requested <= 180 && !recharge.durations.includes(requested)
      ? [...recharge.durations, requested].sort((a, b) => a - b)
      : recharge.durations;
  const initial = durations.includes(requested) ? requested : recharge.durations[0];

  const [stage, setStage] = useState<Stage>('setup');
  const [minutes, setMinutes] = useState(initial);
  const [session, setSession] = useState<Session>();
  const [paused, setPaused] = useState(false);
  const { state, completeSession, updateSettings } = useRest();
  const muted = !state.settings.music;
  const speed = params.has('demo') ? DEMO_SPEED : 1;

  useSeoMeta({ title: `${recharge.name} | Restivist` });

  const finish = useCallback((rested: number) => {
    playChime();
    setSession(completeSession({ practice: recharge.id, minutes: rested }));
    setStage('done');
  }, [completeSession, recharge.id]);

  const Icon = recharge.icon;
  const SoundIcon = muted ? VolumeX : Volume2;

  return (
    <div className="dark relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className={cn('absolute inset-0 bg-gradient-to-b opacity-60', recharge.gradient)} />
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-[2000ms]',
            stage === 'running' ? 'opacity-100' : 'opacity-40',
          )}
        >
          <RestScene recharge={recharge.id} paused={paused} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" className="rounded-full text-base">
            <Link to="/">
              <ArrowLeft className="size-5" aria-hidden />
              Your plan
            </Link>
          </Button>
          <span className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
            <Icon className="size-5" aria-hidden />
            {recharge.name}
            {stage !== 'done' && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 size-11 rounded-full"
                onClick={() => updateSettings({ music: muted })}
                aria-label={muted ? 'Turn soundscape on' : 'Turn soundscape off'}
                title={muted ? 'Turn soundscape on' : 'Turn soundscape off'}
              >
                <SoundIcon className="size-5" aria-hidden />
              </Button>
            )}
          </span>
        </header>

        {stage === 'setup' && (
          <div className="flex flex-1 flex-col justify-center gap-10 py-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
            <div className="space-y-4 text-center">
              <span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/15 text-primary motion-safe:animate-float">
                <Icon className="size-10" aria-hidden />
              </span>
              <h1 className="text-5xl font-semibold tracking-tight">{recharge.name}</h1>
              <p className="mx-auto max-w-md text-lg leading-relaxed text-muted-foreground">{recharge.tip}</p>
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
                playChime(0.12);
                setStage('running');
              }}
            >
              Begin
            </Button>
          </div>
        )}

        {stage === 'running' && (
          <Running
            recharge={recharge}
            minutes={minutes}
            speed={speed}
            muted={muted}
            paused={paused}
            onPausedChange={setPaused}
            onFinish={finish}
          />
        )}

        {stage === 'done' && session && (
          <div className="flex flex-1 flex-col justify-center gap-8 py-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
            <div className="space-y-3 text-center">
              <h1 className="text-5xl font-semibold tracking-tight">Welcome back.</h1>
              <p className="text-lg text-muted-foreground">
                {session.minutes} minute{session.minutes === 1 ? '' : 's'} of {recharge.name.toLowerCase()}. That was part of the work, not a break from it.
              </p>
            </div>
            <RechargeCheckin session={session} />
            <Button asChild size="lg" className="h-12 rounded-full text-base">
              <Link to="/">Back to your plan</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Play the recharge's soundscape while mounted, fading with `muted`. */
function useAmbient(recharge: Recharge, muted: boolean) {
  const ambient = useRef<Ambient>(undefined);
  const initiallyMuted = useRef(muted);

  useEffect(() => {
    const a = startAmbient(recharge.id, initiallyMuted.current);
    ambient.current = a;
    return () => a?.stop();
  }, [recharge.id]);

  useEffect(() => {
    ambient.current?.setMuted(muted);
  }, [muted]);
}

interface RunningProps {
  recharge: Recharge;
  minutes: number;
  /** How many times faster than real time the session runs. */
  speed: number;
  muted: boolean;
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
  onFinish: (minutes: number) => void;
}

function Running({ recharge, minutes, speed, muted, paused, onPausedChange, onFinish }: RunningProps) {
  const navigate = useNavigate();
  const totalMs = minutes * 60_000;
  // Wall-clock timing so the session stays accurate if the tab is backgrounded.
  const [timer, setTimer] = useState(() => ({ startedAt: Date.now(), pausedMs: 0, pausedAt: null as number | null }));
  const [now, setNow] = useState(() => Date.now());
  const finished = useRef(false);
  const { pausedAt } = timer;

  useWakeLock(pausedAt === null);
  useAmbient(recharge, muted || paused);

  const elapsed = Math.min(totalMs, (now - timer.startedAt - timer.pausedMs - (pausedAt ? now - pausedAt : 0)) * speed);
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
    onPausedChange(!paused);
  };

  const restedMinutes = Math.floor(elapsed / 60_000);
  const endEarly = () => {
    if (finished.current) return;
    finished.current = true;
    if (restedMinutes >= 1) onFinish(restedMinutes);
    else navigate('/');
  };

  // A new prompt each minute, or every few seconds of a sped-up demo.
  const promptEvery = speed > 1 ? 8_000 * speed : 60_000;
  const prompt = recharge.prompts[Math.floor(elapsed / promptEvery) % recharge.prompts.length];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-8 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-1000">
      <ChargingBattery
        recharge={recharge.id}
        value={elapsed / totalMs}
        paused={!!pausedAt}
        className="h-[min(44vh,340px)] aspect-[160/280]"
      />

      <div className="text-center">
        <p className="font-display text-6xl font-light tabular-nums" aria-live="off">{formatClock(remaining)}</p>
        <p className="mt-1 text-base text-muted-foreground">
          {pausedAt ? 'Paused' : `${Math.floor((elapsed / totalMs) * 100)}% charged · breathe with the glow`}
        </p>
      </div>

      <p
        key={prompt}
        className="min-h-16 max-w-md text-center font-display text-2xl leading-snug motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000"
        aria-live="polite"
      >
        {prompt}
      </p>

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
