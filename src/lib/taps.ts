import { getContext } from './chime';

/**
 * Taps, the bugle call played at dusk and at military funerals, synthesized
 * with the Web Audio API. Played when you check in on an empty battery.
 */

const BPM = 66;
const VOLUME = 0.5;
const REVERB = 0.45;

/** [beat, midi pitch, length in beats]. */
const G4 = 67, C5 = 72, E5 = 76, G5 = 79;
const NOTES: [number, number, number][] = [
  [0, G4, 0.75], [0.75, G4, 0.25], [1, C5, 3],
  [4, G4, 0.75], [4.75, C5, 0.25], [5, E5, 3],
  [8, G4, 0.75], [8.75, C5, 0.25], [9, E5, 1],
  [10, G4, 0.75], [10.75, C5, 0.25], [11, E5, 1],
  [12, G4, 0.75], [12.75, C5, 0.25], [13, E5, 2],
  [15, C5, 0.75], [15.75, E5, 0.25], [16, G5, 3],
  [19, E5, 0.75], [19.75, C5, 0.25], [20, G4, 2],
  [22, G4, 0.75], [22.75, G4, 0.25], [23, C5, 4],
];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** A bugle note: a sawtooth whose filter opens on the attack, with vibrato on long notes. */
function bugle(ctx: AudioContext, out: AudioNode, sources: AudioScheduledSourceNode[], midi: number, t: number, dur: number) {
  const f = hz(midi);
  const end = t + dur + 0.3;

  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = f;
  sources.push(o);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 2;
  lp.frequency.setValueAtTime(f * 1.5, t);
  lp.frequency.linearRampToValueAtTime(f * 6, t + 0.06);
  lp.frequency.exponentialRampToValueAtTime(f * 3.5, t + 0.35);

  if (dur > 1) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t + 0.5);
    depth.gain.linearRampToValueAtTime(f * 0.012, t + 1.2);
    lfo.connect(depth).connect(o.frequency);
    lfo.start(t);
    lfo.stop(end);
    sources.push(lfo);
  }

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.3, t + 0.05);
  amp.gain.setValueAtTime(0.3, t + dur);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);

  o.connect(lp).connect(amp).connect(out);
  o.start(t);
  o.stop(end);
}

/** A decaying burst of noise, used as a reverb impulse response. */
export function roomImpulse(ctx: AudioContext, seconds = 2.5): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}

let stopCurrent: (() => void) | undefined;
const listeners = new Set<() => void>();

function setStop(stop: (() => void) | undefined) {
  stopCurrent = stop;
  for (const listener of listeners) listener();
}

/** Subscribe to play/stop changes, for `useSyncExternalStore`. */
export function subscribeTaps(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isTapsPlaying(): boolean {
  return stopCurrent !== undefined;
}

export function stopTaps(): void {
  stopCurrent?.();
}

/** Play Taps from the top, cutting off any performance already underway. */
export function playTaps(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  stopTaps();

  const master = ctx.createGain();
  master.gain.value = VOLUME;
  master.connect(ctx.destination);

  const out = ctx.createGain();
  out.connect(master);
  const room = ctx.createConvolver();
  room.buffer = roomImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = REVERB;
  out.connect(room).connect(wet).connect(master);

  const sources: AudioScheduledSourceNode[] = [];
  const t0 = ctx.currentTime + 0.05;
  const beat = 60 / BPM;
  for (const [b, midi, dur] of NOTES) bugle(ctx, out, sources, midi, t0 + b * beat, dur * beat * 0.94);

  // Let the last note ring out through the reverb before calling it done.
  const [lastBeat, , lastDur] = NOTES[NOTES.length - 1];
  const done = setTimeout(() => stop(), ((lastBeat + lastDur) * beat + 2) * 1000);

  const stop = () => {
    clearTimeout(done);
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.08);
    for (const src of sources) {
      try {
        src.stop(now + 0.1);
      } catch {
        // Already stopped.
      }
    }
    setTimeout(() => master.disconnect(), 200);
    if (stopCurrent === stop) setStop(undefined);
  };
  setStop(stop);
}
