let ctx: AudioContext | undefined;

export function getContext(): AudioContext | undefined {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return undefined;
  ctx ??= new AudioContext();
  return ctx;
}

/**
 * Unlock audio playback. Browsers only allow sound after a user gesture, so
 * call this from a click handler before a session starts.
 */
export function primeAudio(): void {
  const audio = getContext();
  if (audio?.state === 'suspended') void audio.resume();
}

/** A bright rising arpeggio, one step per bar gained. */
export function playChargeUp(bars: number, volume = 0.16): void {
  const audio = getContext();
  if (!audio || bars <= 0) return;
  if (audio.state === 'suspended') void audio.resume();

  // C major, climbing: one note per bar, then a sparkle on top.
  const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  const notes = [...scale.slice(0, Math.min(bars, 4)), scale[4]];
  notes.forEach((freq, i) => {
    const t = audio.currentTime + 0.05 + i * 0.13;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(volume, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + (i === notes.length - 1 ? 1.6 : 0.5));
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 1.7);
  });
}

/** A soft singing-bowl chime synthesized with the Web Audio API. */
export function playChime(volume = 0.25): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  const now = audio.currentTime;
  const partials = [
    { freq: 396, gain: 1, decay: 5 },
    { freq: 594, gain: 0.5, decay: 4 },
    { freq: 1063, gain: 0.25, decay: 2.5 },
  ];

  for (const { freq, gain, decay } of partials) {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(volume * gain, now + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(amp).connect(audio.destination);
    osc.start(now);
    osc.stop(now + decay);
  }
}
