import { getContext } from './chime';

/**
 * A little song for each battery level, synthesized with the Web Audio API:
 * Taps for an empty battery, rising through to a full-blown hype drop.
 */

interface Kit {
  ctx: AudioContext;
  /** Instruments connect here. */
  out: AudioNode;
  /** Register a source so it can be cut off when another song starts. */
  track: (node: AudioScheduledSourceNode) => void;
}

interface Song {
  bpm: number;
  volume: number;
  /** Wet level of the room reverb, 0 to 1. */
  reverb: number;
  /** Schedule every note. `at` converts beats to AudioContext time. */
  play: (k: Kit, at: (beat: number) => number, len: (beats: number) => number) => void;
}

/** A note: [beat, midi pitch, length in beats]. */
type Note = [number, number, number];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// Instruments ------------------------------------------------------------

function osc(k: Kit, type: OscillatorType, freq: number, start: number, stop: number): OscillatorNode {
  const o = k.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.start(start);
  o.stop(stop);
  k.track(o);
  return o;
}

/** Attack, hold for `dur`, then release. */
function envelope(k: Kit, t: number, dur: number, peak: number, attack: number, release: number): GainNode {
  const g = k.ctx.createGain();
  const hold = t + Math.max(attack, dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, hold);
  g.gain.exponentialRampToValueAtTime(0.0001, hold + release);
  return g;
}

/** Strike, then fade away over `decay` seconds. */
function strike(k: Kit, t: number, peak: number, decay: number): GainNode {
  const g = k.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  return g;
}

function filter(k: Kit, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const f = k.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

function noise(k: Kit, start: number, stop: number): AudioBufferSourceNode {
  let buffer = noiseBuffers.get(k.ctx);
  if (!buffer) {
    buffer = k.ctx.createBuffer(1, k.ctx.sampleRate, k.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(k.ctx, buffer);
  }
  const src = k.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start(start);
  src.stop(stop);
  k.track(src);
  return src;
}

/** A bugle: a sawtooth whose filter opens on the attack, with vibrato on long notes. */
function bugle(k: Kit, midi: number, t: number, dur: number) {
  const f = hz(midi);
  const end = t + dur + 0.3;
  const o = osc(k, 'sawtooth', f, t, end);
  const lp = filter(k, 'lowpass', f * 1.5, 2);
  lp.frequency.setValueAtTime(f * 1.5, t);
  lp.frequency.linearRampToValueAtTime(f * 6, t + 0.06);
  lp.frequency.exponentialRampToValueAtTime(f * 3.5, t + 0.35);
  if (dur > 1) {
    const lfo = osc(k, 'sine', 5.2, t, end);
    const depth = k.ctx.createGain();
    depth.gain.setValueAtTime(0, t + 0.5);
    depth.gain.linearRampToValueAtTime(f * 0.012, t + 1.2);
    lfo.connect(depth).connect(o.frequency);
  }
  o.connect(lp).connect(envelope(k, t, dur, 0.3, 0.05, 0.25)).connect(k.out);
}

/** A soft, felt-piano-ish tone. */
function felt(k: Kit, midi: number, t: number, dur: number, vel = 1) {
  const decay = dur + 1.2;
  const g = strike(k, t, 0.22 * vel, decay);
  osc(k, 'sine', hz(midi), t, t + decay).connect(g);
  const overtone = k.ctx.createGain();
  overtone.gain.value = 0.15;
  osc(k, 'triangle', hz(midi + 12), t, t + decay).connect(overtone).connect(g);
  g.connect(k.out);
}

/** A bright plucked tone. */
function pluck(k: Kit, midi: number, t: number, dur: number, vel = 1, type: OscillatorType = 'triangle') {
  const decay = Math.min(dur, 1) + 0.35;
  const lp = filter(k, 'lowpass', 3000);
  osc(k, type, hz(midi), t, t + decay).connect(lp).connect(strike(k, t, 0.2 * vel, decay)).connect(k.out);
}

/** A whistled melody: a pure tone with a little wobble. */
function whistle(k: Kit, midi: number, t: number, dur: number) {
  const f = hz(midi);
  const end = t + dur + 0.2;
  const o = osc(k, 'sine', f, t, end);
  o.frequency.setValueAtTime(f * 0.97, t);
  o.frequency.linearRampToValueAtTime(f, t + 0.04);
  const lfo = osc(k, 'sine', 6, t, end);
  const depth = k.ctx.createGain();
  depth.gain.value = f * 0.006;
  lfo.connect(depth).connect(o.frequency);
  o.connect(envelope(k, t, dur * 0.9, 0.2, 0.03, 0.12)).connect(k.out);
}

/** A fat detuned-sawtooth lead. */
function supersaw(k: Kit, midi: number, t: number, dur: number, vel = 1) {
  const lp = filter(k, 'lowpass', 4000);
  const g = envelope(k, t, dur * 0.9, 0.09 * vel, 0.01, 0.08);
  for (const cents of [-14, 0, 14]) {
    const o = osc(k, 'sawtooth', hz(midi), t, t + dur + 0.2);
    o.detune.value = cents;
    o.connect(lp);
  }
  lp.connect(g).connect(k.out);
}

function bass(k: Kit, midi: number, t: number, dur: number, vel = 1) {
  const lp = filter(k, 'lowpass', 500, 4);
  const g = envelope(k, t, dur * 0.85, 0.28 * vel, 0.005, 0.05);
  osc(k, 'sawtooth', hz(midi), t, t + dur + 0.1).connect(lp);
  osc(k, 'sine', hz(midi), t, t + dur + 0.1).connect(lp);
  lp.connect(g).connect(k.out);
}

function kick(k: Kit, t: number, vel = 1) {
  const o = osc(k, 'sine', 150, t, t + 0.4);
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  o.connect(strike(k, t, 0.9 * vel, 0.35)).connect(k.out);
}

function snare(k: Kit, t: number, vel = 1) {
  noise(k, t, t + 0.2).connect(filter(k, 'highpass', 1200)).connect(strike(k, t, 0.4 * vel, 0.18)).connect(k.out);
  osc(k, 'triangle', 190, t, t + 0.1).connect(strike(k, t, 0.3 * vel, 0.08)).connect(k.out);
}

function hat(k: Kit, t: number, vel = 1) {
  noise(k, t, t + 0.06).connect(filter(k, 'highpass', 7000)).connect(strike(k, t, 0.15 * vel, 0.05)).connect(k.out);
}

function crash(k: Kit, t: number) {
  noise(k, t, t + 1.8).connect(filter(k, 'highpass', 4000)).connect(strike(k, t, 0.3, 1.7)).connect(k.out);
}

/** A rising whoosh of filtered noise. */
function riser(k: Kit, t: number, dur: number) {
  const bp = filter(k, 'bandpass', 300, 3);
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(8000, t + dur);
  const g = k.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
  noise(k, t, t + dur + 0.05).connect(bp).connect(g).connect(k.out);
}

/** BWAAMP. */
function airhorn(k: Kit, t: number, dur: number) {
  const f = hz(70);
  const bp = filter(k, 'peaking', 1800, 1);
  bp.gain.value = 8;
  const g = envelope(k, t, dur, 0.12, 0.01, 0.06);
  for (const ratio of [1, 1.006, 0.994, 1.498]) {
    const o = osc(k, 'sawtooth', f * ratio, t, t + dur + 0.1);
    o.frequency.setValueAtTime(f * ratio * 0.85, t);
    o.frequency.exponentialRampToValueAtTime(f * ratio, t + 0.05);
    o.connect(bp);
  }
  bp.connect(g).connect(k.out);
}

// Songs --------------------------------------------------------------------

/** Taps, the bugle call played at dusk and at military funerals. */
const taps: Song = {
  bpm: 66,
  volume: 0.5,
  reverb: 0.45,
  play(k, at, len) {
    const G4 = 67, C5 = 72, E5 = 76, G5 = 79;
    const notes: Note[] = [
      [0, G4, 0.75], [0.75, G4, 0.25], [1, C5, 3],
      [4, G4, 0.75], [4.75, C5, 0.25], [5, E5, 3],
      [8, G4, 0.75], [8.75, C5, 0.25], [9, E5, 1],
      [10, G4, 0.75], [10.75, C5, 0.25], [11, E5, 1],
      [12, G4, 0.75], [12.75, C5, 0.25], [13, E5, 2],
      [15, C5, 0.75], [15.75, E5, 0.25], [16, G5, 3],
      [19, E5, 0.75], [19.75, C5, 0.25], [20, G4, 2],
      [22, G4, 0.75], [22.75, G4, 0.25], [23, C5, 4],
    ];
    for (const [beat, midi, dur] of notes) bugle(k, midi, at(beat), len(dur) * 0.94);
  },
};

/** Low: a slow, sighing lullaby in A minor. */
const sigh: Song = {
  bpm: 72,
  volume: 0.7,
  reverb: 0.4,
  play(k, at, len) {
    const melody: Note[] = [
      [0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 1], [3, 71, 1],
      [4, 69, 2], [6, 72, 1], [7, 71, 1],
      [8, 69, 1], [9, 68, 1], [10, 69, 4],
    ];
    const chords: [number, number[], number][] = [
      [0, [45, 52, 57], 4],
      [4, [41, 48, 53], 4],
      [8, [40, 47, 56], 2],
      [10, [45, 52, 57], 4],
    ];
    for (const [beat, midi, dur] of melody) felt(k, midi, at(beat), len(dur));
    for (const [beat, notes, dur] of chords) {
      notes.forEach((midi, i) => felt(k, midi, at(beat) + i * 0.06, len(dur), 0.55));
    }
  },
};

/** Okay: a whistled shrug over a strummed ukulele-ish accompaniment. */
const shrug: Song = {
  bpm: 104,
  volume: 0.7,
  reverb: 0.2,
  play(k, at, len) {
    const melody: Note[] = [
      [0, 72, 0.5], [0.5, 76, 0.5], [1, 79, 1], [2, 76, 1], [3, 72, 1],
      [4, 74, 0.5], [4.5, 77, 0.5], [5, 81, 1], [6, 79, 2],
      [8, 76, 0.5], [8.5, 79, 0.5], [9, 84, 1], [10, 83, 0.5], [10.5, 81, 0.5], [11, 79, 1],
      [12, 77, 0.5], [12.5, 74, 0.5], [13, 71, 1], [14, 72, 2],
    ];
    const C = [60, 64, 67], G7 = [59, 62, 65, 67], Am = [57, 60, 64];
    const strums: [number, number[]][] = [
      [0, C], [2, C], [4, G7], [6, G7], [8, Am], [10, C], [12, G7], [14, C],
    ];
    for (const [beat, midi, dur] of melody) whistle(k, midi, at(beat), len(dur));
    for (const [beat, notes] of strums) {
      notes.forEach((midi, i) => pluck(k, midi, at(beat) + i * 0.025, len(1.5), 0.7));
      bass(k, notes[0] - 12, at(beat), len(1), 0.6);
    }
  },
};

/** Good: a bouncy, sunny little groove in G major. */
const bounce: Song = {
  bpm: 128,
  volume: 0.7,
  reverb: 0.15,
  play(k, at, len) {
    const melody: Note[] = [
      [0, 67, 0.5], [0.5, 71, 0.5], [1, 74, 0.5], [1.5, 79, 1], [2.5, 76, 0.5], [3, 74, 1],
      [4, 72, 0.5], [4.5, 76, 0.5], [5, 79, 0.5], [5.5, 81, 1], [6.5, 79, 0.5], [7, 78, 1],
      [8, 83, 0.5], [8.5, 81, 0.5], [9, 79, 0.5], [9.5, 74, 0.5], [10, 76, 0.5], [10.5, 78, 0.5], [11, 79, 1],
      [12, 83, 0.25], [12.25, 86, 0.25], [12.5, 91, 1.5],
    ];
    const roots = [43, 48, 50, 43];
    for (const [beat, midi, dur] of melody) pluck(k, midi, at(beat), len(dur), 0.8, 'square');
    roots.forEach((root, bar) => {
      for (let i = 0; i < 8; i++) {
        const beat = bar * 4 + i / 2;
        if (beat > 12.5) break;
        bass(k, root + (i % 2 ? 12 : 0), at(beat), len(0.5), 0.7);
        if (i % 2) hat(k, at(beat));
        if (i % 4 === 0) kick(k, at(beat), 0.7);
        if (i % 4 === 2) snare(k, at(beat), 0.5);
      }
    });
    for (const midi of [55, 59, 62, 67]) pluck(k, midi, at(12.5), len(1.5), 0.6);
    crash(k, at(12.5));
  },
};

/** Full: a snare-roll build, air horns, and a drop. Absolutely unhinged. */
const hype: Song = {
  bpm: 150,
  volume: 0.6,
  reverb: 0.1,
  play(k, at, len) {
    // The build: two bars of accelerating snare over a riser.
    riser(k, at(0), len(8));
    for (let b = 0; b < 8; b += b < 4 ? 1 : b < 6 ? 0.5 : 0.25) {
      snare(k, at(b), 0.3 + (b / 8) * 0.7);
      bass(k, 28, at(b), len(0.2), 0.4 + (b / 8) * 0.6);
    }

    // The drop.
    const drop = 8;
    crash(k, at(drop));
    airhorn(k, at(drop), len(0.35));
    airhorn(k, at(drop + 0.5), len(0.35));
    airhorn(k, at(drop + 1), len(1.5));

    const riff1: Note[] = [[0, 76, 0.5], [0.5, 76, 0.25], [1, 79, 0.5], [1.5, 76, 0.5], [2, 81, 0.5], [2.5, 79, 0.5], [3, 83, 0.75]];
    const riff2: Note[] = [[0, 84, 0.5], [0.5, 83, 0.5], [1, 81, 0.5], [1.5, 79, 0.5], [2, 78, 0.5], [2.5, 79, 0.5], [3, 74, 0.75]];
    const climb: Note[] = [76, 78, 79, 81, 83, 84, 86, 88, 90, 91, 93, 95].map((midi, i) => [i / 4, midi, 0.25]);
    const bars = [riff1, riff2, riff1, climb];
    const roots = [40, 36, 43, 38];

    bars.forEach((riff, bar) => {
      const start = drop + bar * 4;
      for (const [beat, midi, dur] of riff) supersaw(k, midi, at(start + beat), len(dur));
      for (let i = 0; i < 4; i++) {
        kick(k, at(start + i));
        if (i % 2) snare(k, at(start + i));
        hat(k, at(start + i + 0.5));
        hat(k, at(start + i + 0.75), 0.5);
        // Offbeat bass pumps against the kick.
        bass(k, roots[bar], at(start + i + 0.5), len(0.45));
      }
    });

    // Big finish.
    const end = drop + 16;
    kick(k, at(end));
    crash(k, at(end));
    airhorn(k, at(end), len(2));
    bass(k, 28, at(end), len(2.5));
    for (const midi of [64, 71, 76, 79, 83, 88]) supersaw(k, midi, at(end), len(2.5), 0.8);
  },
};

const SONGS: Record<number, Song> = { 1: taps, 2: sigh, 3: shrug, 4: bounce, 5: hype };

let stopCurrent: (() => void) | undefined;

/** A decaying burst of noise, used as a reverb impulse response. */
function roomImpulse(ctx: AudioContext, seconds = 2.5): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}

/** Stop whatever battery song is playing. */
export function stopBatterySong(): void {
  stopCurrent?.();
  stopCurrent = undefined;
}

/** Play the song for a battery level (1 to 5), cutting off any song already playing. */
export function playBatterySong(level: number): void {
  const song = SONGS[level];
  const ctx = getContext();
  if (!song || !ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  stopBatterySong();

  const master = ctx.createGain();
  master.gain.value = song.volume;
  master.connect(ctx.destination);

  const out = ctx.createGain();
  out.connect(master);
  if (song.reverb > 0) {
    const room = ctx.createConvolver();
    room.buffer = roomImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = song.reverb;
    out.connect(room).connect(wet).connect(master);
  }

  const sources: AudioScheduledSourceNode[] = [];
  const kit: Kit = { ctx, out, track: (node) => sources.push(node) };
  const t0 = ctx.currentTime + 0.05;
  const beat = 60 / song.bpm;
  song.play(kit, (b) => t0 + b * beat, (b) => b * beat);

  stopCurrent = () => {
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
  };
}
