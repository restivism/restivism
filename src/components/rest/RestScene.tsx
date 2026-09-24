import type { RechargeId } from '@/lib/rest';
import { glow, rand, type Scene, spawnMany } from '@/lib/scene';

import { SceneCanvas } from './SceneCanvas';

/**
 * A slow, generative backdrop for a rest session, drawn on a canvas:
 * stars for sleep, drifting kites of color for play, warm lanterns for social.
 */
export function RestScene({ recharge, paused = false }: { recharge: RechargeId; paused?: boolean }) {
  return <SceneCanvas scene={SCENES[recharge]} paused={paused} />;
}

let shooting: { x: number; y: number; life: number } | undefined;

const SCENES: Record<RechargeId, Scene> = {
  sleep: {
    spawn: (w, h) => spawnMany(Math.round((w * h) / 5000), () => ({
      x: rand(0, w),
      y: rand(0, h * 0.85),
      r: rand(0.4, 1.6),
      v: rand(0.3, 1.2),
      p: rand(0, Math.PI * 2),
      h: rand(210, 260),
    })),
    draw(ctx, ps, t, dt, w, h) {
      // The moon, breathing slowly.
      // Tucked into the corner on phones, where the middle is all battery.
      const narrow = w < 640;
      const mx = narrow ? w - 44 : w * 0.78;
      const my = narrow ? 104 : h * 0.18;
      glow(ctx, mx, my, 220 + Math.sin(t * 0.6) * 20, '45 90% 85%', 0.18);
      // A crescent: the full disc, minus an offset one.
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, 26, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.rect(mx - 30, my - 30, 60, 60);
      ctx.arc(mx + 11, my - 7, 24, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(45 70% 92% / 0.95)';
      ctx.fill('evenodd');
      ctx.restore();

      for (const s of ps) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.v + s.p));
        ctx.fillStyle = `hsla(${s.h} 80% 90% / ${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        s.x -= dt * 2 * s.v;
        if (s.x < -2) s.x = w + 2;
      }

      // Once in a while, a shooting star.
      if (!shooting && dt > 0 && Math.random() < dt / 9) shooting = { x: rand(w * 0.1, w * 0.7), y: rand(0, h * 0.3), life: 1 };
      if (shooting) {
        const { x, y, life } = shooting;
        const len = 140;
        const g = ctx.createLinearGradient(x, y, x - len, y - len * 0.4);
        g.addColorStop(0, `hsla(45 100% 95% / ${life})`);
        g.addColorStop(1, 'hsla(45 100% 95% / 0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - len, y - len * 0.4);
        ctx.stroke();
        shooting.x += dt * 520;
        shooting.y += dt * 210;
        shooting.life -= dt * 1.1;
        if (shooting.life <= 0) shooting = undefined;
      }
    },
  },

  play: {
    spawn: (w, h) => spawnMany(Math.round((w * h) / 26000) + 8, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(6, 22),
      v: rand(10, 32),
      p: rand(0, Math.PI * 2),
      h: [18, 36, 330, 280, 190][Math.floor(rand(0, 5))],
    })),
    draw(ctx, ps, t, dt, w, h) {
      for (const s of ps) {
        const x = s.x + Math.sin(t * 0.5 + s.p) * 30;
        glow(ctx, x, s.y, s.r * 4, `${s.h} 90% 65%`, 0.12);
        ctx.save();
        ctx.translate(x, s.y);
        ctx.rotate(t * 0.3 + s.p);
        ctx.fillStyle = `hsla(${s.h} 90% 70% / 0.55)`;
        const shape = Math.floor(s.p * 10) % 3;
        ctx.beginPath();
        if (shape === 0) {
          ctx.arc(0, 0, s.r * 0.6, 0, Math.PI * 2);
        } else if (shape === 1) {
          ctx.roundRect(-s.r * 0.5, -s.r * 0.5, s.r, s.r, s.r * 0.2);
        } else {
          ctx.moveTo(0, -s.r * 0.7);
          ctx.lineTo(s.r * 0.6, s.r * 0.4);
          ctx.lineTo(-s.r * 0.6, s.r * 0.4);
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
        s.y -= dt * s.v;
        if (s.y < -40) {
          s.y = h + 40;
          s.x = rand(0, w);
        }
      }
    },
  },

  social: {
    spawn: (w, h) => spawnMany(Math.round((w * h) / 30000) + 10, () => ({
      x: rand(0, w),
      y: rand(h * 0.2, h),
      r: rand(18, 60),
      v: rand(4, 14),
      p: rand(0, Math.PI * 2),
      h: rand(28, 48),
    })),
    draw(ctx, ps, t, dt, w, h) {
      for (const s of ps) {
        const flicker = 0.75 + 0.25 * Math.sin(t * 2.2 + s.p) * Math.sin(t * 1.3 + s.p * 2);
        const x = s.x + Math.sin(t * 0.25 + s.p) * 18;
        glow(ctx, x, s.y, s.r * 2.2, `${s.h} 95% 60%`, 0.22 * flicker);
        glow(ctx, x, s.y, s.r * 0.35, `${s.h} 100% 85%`, 0.7 * flicker);
        s.y -= dt * s.v;
        if (s.y < -80) {
          s.y = h + 80;
          s.x = rand(0, w);
        }
      }
    },
  },
};
