import { useEffect, useRef } from 'react';

import type { Particle, Scene } from '@/lib/scene';
import { cn } from '@/lib/utils';

interface SceneCanvasProps {
  scene: Scene;
  paused?: boolean;
  className?: string;
}

/**
 * Runs a generative `Scene` on a canvas that fills its parent. Draws one
 * still frame when the user prefers reduced motion.
 */
export function SceneCanvas({ scene, paused = false, className }: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = scene.spawn(width, height);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let last = performance.now();
    let t = 0;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) t += dt;
      ctx.clearRect(0, 0, width, height);
      scene.draw(ctx, particles, t, pausedRef.current ? 0 : dt, width, height);
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [scene]);

  return <canvas ref={canvasRef} className={cn('absolute inset-0 h-full w-full', className)} aria-hidden />;
}
