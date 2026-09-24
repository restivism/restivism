import { getContext } from './chime';
import type { RechargeId } from './rest';
import { roomImpulse } from './taps';

/**
 * Generative soundscapes for rest sessions, synthesized with the Web Audio
 * API so nothing has to be downloaded: soft surf and a low drone for sleep,
 * a wandering music box for play, and warm slow chords for social time.
 */

const VOLUME = 0.22;
const FADE = 2.5;

export interface Ambient {
  /** Fade out and release everything. */
  stop: () => void;
  /** Fade to silence (or back) without stopping the generators. */
  setMuted: (muted: boolean) => void;
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

type Voice = (ctx: AudioContext, out: AudioNode, wet: AudioNode) => () => void;

/** Brown noise, which sounds like distant surf once it is filtered. */
function brownNoise(ctx: AudioContext): AudioBufferSourceNode {
  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

const sleep: Voice = (ctx, out, wet) => {
  const nodes: AudioScheduledSourceNode[] = [];

  // Surf: noise swelling in and out about every twelve seconds.
  const noise = brownNoise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  const swell = ctx.createGain();
  swell.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 1 / 12;
  const depth = ctx.createGain();
  depth.gain.value = 0.35;
  lfo.connect(depth).connect(swell.gain);
  noise.connect(lp).connect(swell).connect(out);
  nodes.push(noise, lfo);

  // Drone: an open fifth, barely there.
  for (const [midi, gain] of [[45, 0.06], [52, 0.04], [57, 0.025]] as const) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(midi);
    o.detune.value = Math.random() * 6 - 3;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g).connect(out);
    g.connect(wet);
    nodes.push(o);
  }

  for (const n of nodes) n.start();
  return () => nodes.forEach((n) => n.stop());
};

/** One struck note with a bell-like decay. */
function pluck(ctx: AudioContext, out: AudioNode, wet: AudioNode, midi: number, t: number, gain: number, decay: number) {
  for (const [ratio, level] of [[1, 1], [2, 0.3], [3, 0.12]] as const) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(midi) * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / ratio);
    o.connect(g);
    g.connect(out);
    g.connect(wet);
    o.start(t);
    o.stop(t + decay);
  }
}

/** Schedule notes a little ahead of time so timers never make them stutter. */
function scheduler(ctx: AudioContext, next: (t: number) => number): () => void {
  let at = ctx.currentTime + 0.3;
  const tick = () => {
    while (at < ctx.currentTime + 1) at += next(at);
  };
  tick();
  const id = window.setInterval(tick, 250);
  return () => window.clearInterval(id);
}

const PENTATONIC = [72, 74, 76, 79, 81, 84, 86, 88];

const play: Voice = (ctx, out, wet) => {
  let step = Math.floor(Math.random() * PENTATONIC.length);
  return scheduler(ctx, (t) => {
    // A gentle random walk, so it sounds like a tune rather than noise.
    step = Math.max(0, Math.min(PENTATONIC.length - 1, step + pick([-2, -1, -1, 1, 1, 2])));
    pluck(ctx, out, wet, PENTATONIC[step], t, 0.09, 2.2);
    if (Math.random() < 0.25) pluck(ctx, out, wet, PENTATONIC[step] - 24, t, 0.06, 3);
    return pick([0.4, 0.4, 0.8, 0.8, 1.2]);
  });
};

// Fmaj7, Em7, Dm9, Cmaj7: a slow, warm turnaround.
const CHORDS = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 64],
  [48, 52, 55, 59],
];

const social: Voice = (ctx, out, wet) => {
  let i = 0;
  return scheduler(ctx, (t) => {
    const chord = CHORDS[i++ % CHORDS.length];
    const len = 8;
    for (const midi of chord) {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = hz(midi);
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 2.5);
        g.gain.setValueAtTime(0.03, t + len - 1);
        g.gain.linearRampToValueAtTime(0, t + len + 1.5);
        o.connect(g);
        g.connect(out);
        g.connect(wet);
        o.start(t);
        o.stop(t + len + 1.6);
      }
    }
    // A melody note now and then, like someone humming along.
    pluck(ctx, out, wet, pick(chord) + 12, t + 2 + Math.random() * 4, 0.05, 3);
    return len;
  });
};

const VOICES: Record<RechargeId, Voice> = { sleep, play, social };

/** Start the soundscape for a recharge. Call from a user gesture. */
export function startAmbient(recharge: RechargeId, muted = false): Ambient | undefined {
  const ctx = getContext();
  if (!ctx) return undefined;
  if (ctx.state === 'suspended') void ctx.resume();

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  if (!muted) master.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + FADE);
  master.connect(ctx.destination);

  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2400;
  tone.connect(master);

  const room = ctx.createConvolver();
  room.buffer = roomImpulse(ctx, 4);
  const wet = ctx.createGain();
  wet.gain.value = 0.6;
  wet.connect(room).connect(tone);

  const release = VOICES[recharge](ctx, tone, wet);

  const fadeTo = (value: number, seconds: number) => {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(value, now + seconds);
  };

  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      fadeTo(0, 1.5);
      window.setTimeout(() => {
        release();
        master.disconnect();
      }, 1700);
    },
    setMuted: (m) => {
      if (!stopped) fadeTo(m ? 0 : VOLUME, m ? 0.4 : FADE);
    },
  };
}
