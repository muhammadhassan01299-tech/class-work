import { useEffect, useRef } from 'react';

interface StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
}

const STAR_COLORS = ['#00B4D8', '#48CAE4', '#90E0EF', '#FFFFFF', '#0077B6'];

export function MouseStarTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || reducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const particles: StarParticle[] = [];
    let lastSpawn = 0;
    let rafId = 0;

    const spawnStar = (x: number, y: number) => {
      if (particles.length >= 55) {
        particles.shift();
      }
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -0.4 - Math.random() * 0.75,
        size: 4 + Math.random() * 5,
        alpha: 0.9,
        decay: 0.02 + Math.random() * 0.015,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.06,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      });
    };

    const drawFourPointStar = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      rotation: number,
      color: string,
      alpha: number
    ) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.globalAlpha = Math.max(0, alpha);
      context.fillStyle = color;
      context.shadowColor = '#90E0EF';
      context.shadowBlur = 8;

      context.beginPath();
      const inner = radius * 0.3;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const nextAngle = angle + Math.PI / 4;
        if (i === 0) {
          context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        } else {
          context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        context.lineTo(Math.cos(nextAngle) * inner, Math.sin(nextAngle) * inner);
      }
      context.closePath();
      context.fill();
      context.restore();
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        drawFourPointStar(ctx, p.x, p.y, p.size, p.rotation, p.color, p.alpha);
      }

      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSpawn < 24) return;
      lastSpawn = now;
      spawnStar(e.clientX, e.clientY);
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}
