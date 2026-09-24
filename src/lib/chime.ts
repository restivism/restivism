let ctx: AudioContext | undefined;

function getContext(): AudioContext | undefined {
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
