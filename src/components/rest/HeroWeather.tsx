import { glow, rand, type Scene, spawnMany } from '@/lib/scene';

import { SceneCanvas } from './SceneCanvas';

/** Rain, whose weight and speed vary with how empty the battery is. */
function rain(density: number, speed: number, alpha: number): Scene {
  return {
    spawn: (w, h) => spawnMany(Math.round((w * h) / density), () => ({
      x: rand(-100, w + 100),
      y: rand(-h, h),
      r: rand(10, 26),
      v: rand(0.8, 1.2) * speed,
      p: 0,
      h: rand(0.5, 1) * alpha,
    })),
    draw(ctx, ps, _t, dt, w, h) {
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (const s of ps) {
        ctx.strokeStyle = `hsla(215 60% 88% / ${s.h})`;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.r * 0.22, s.y + s.r);
        ctx.stroke();
        s.y += dt * s.v;
        s.x -= dt * s.v * 0.22;
        if (s.y > h + 30) {
          s.y = rand(-60, -10);
          s.x = rand(0, w + 150);
        }
      }
    },
  };
}

/** Slow warm lights that wander and blink, for a battery that is steady. */
function fireflies(density: number, brightness: number): Scene {
  return {
    spawn: (w, h) => spawnMany(Math.round((w * h) / density) + 6, () => ({
      x: rand(0, w),
      y: rand(h * 0.25, h),
      r: rand(1.5, 3),
      v: rand(0.3, 0.9),
      p: rand(0, Math.PI * 2),
      h: rand(48, 70),
    })),
    draw(ctx, ps, t, dt, w, h) {
      for (const s of ps) {
        const blink = Math.max(0, Math.sin(t * s.v * 1.7 + s.p)) ** 2;
        glow(ctx, s.x, s.y, s.r * 9, `${s.h} 100% 65%`, 0.35 * blink * brightness);
        ctx.fillStyle = `hsla(${s.h} 100% 85% / ${blink * brightness})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        s.x += dt * Math.cos(t * s.v + s.p) * 14;
        s.y += dt * (Math.sin(t * s.v * 0.7 + s.p * 2) * 10 - 3);
        if (s.y < h * 0.1) s.y = h;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
      }
    },
  };
}

/** Dust drifting sideways through low sun, for a battery that is getting by. */
const motes: Scene = {
  spawn: (w, h) => spawnMany(Math.round((w * h) / 9000), () => ({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(0.8, 2.2),
    v: rand(6, 18),
    p: rand(0, Math.PI * 2),
    h: rand(0.2, 0.55),
  })),
  draw(ctx, ps, t, dt, w) {
    for (const s of ps) {
      ctx.fillStyle = `hsla(40 80% 88% / ${s.h * (0.6 + 0.4 * Math.sin(t + s.p))})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y + Math.sin(t * 0.4 + s.p) * 12, s.r, 0, Math.PI * 2);
      ctx.fill();
      s.x += dt * s.v;
      if (s.x > w + 5) s.x = -5;
    }
  },
};

const CONFETTI_HUES = [345, 30, 48, 150, 200, 265];

/** Confetti tumbling down, for a full battery. */
const confetti: Scene = {
  spawn: (w, h) => spawnMany(Math.round((w * h) / 9000), () => ({
    x: rand(0, w),
    y: rand(-h, h),
    r: rand(5, 10),
    v: rand(40, 90),
    p: rand(0, Math.PI * 2),
    h: CONFETTI_HUES[Math.floor(rand(0, CONFETTI_HUES.length))],
  })),
  draw(ctx, ps, t, dt, w, h) {
    for (const s of ps) {
      const x = s.x + Math.sin(t * 1.3 + s.p) * 24;
      ctx.save();
      ctx.translate(x, s.y);
      ctx.rotate(t * 1.5 + s.p);
      // Flip on one axis so each piece seems to tumble.
      ctx.scale(Math.cos(t * 3 + s.p), 1);
      ctx.fillStyle = `hsla(${s.h} 90% 62% / 0.85)`;
      ctx.fillRect(-s.r / 2, -s.r * 0.3, s.r, s.r * 0.6);
      ctx.restore();
      s.y += dt * s.v;
      if (s.y > h + 20) {
        s.y = -20;
        s.x = rand(0, w);
      }
    }
  },
};

/** One scene per battery level; the unrated dusk gets a few fireflies. */
const WEATHER: Record<number, Scene> = {
  0: fireflies(60000, 0.8),
  1: rain(2600, 900, 0.5),
  2: rain(9000, 520, 0.35),
  3: motes,
  4: fireflies(16000, 1),
  5: confetti,
};

/** Living weather over the hero backdrop that matches the battery reading. */
export function HeroWeather({ level }: { level?: number }) {
  return (
    <div key={level ?? 0} className="absolute inset-0 -z-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000" aria-hidden>
      <SceneCanvas scene={WEATHER[level ?? 0]} />
    </div>
  );
}
