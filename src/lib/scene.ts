/** Building blocks for the small generative canvas scenes around the app. */

export interface Particle {
  x: number;
  y: number;
  r: number;
  /** Speed, phase, and hue: meaning varies per scene. */
  v: number;
  p: number;
  h: number;
}

export interface Scene {
  spawn: (w: number, h: number) => Particle[];
  draw: (ctx: CanvasRenderingContext2D, ps: Particle[], t: number, dt: number, w: number, h: number) => void;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function spawnMany(n: number, make: () => Particle): Particle[] {
  return Array.from({ length: n }, make);
}

/** A soft radial glow, the building block of every scene. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `hsla(${color} / ${alpha})`);
  g.addColorStop(1, `hsla(${color} / 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
