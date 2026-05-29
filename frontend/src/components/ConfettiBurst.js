'use client';

// ConfettiBurst — lightweight canvas particle burst used on order success.
//
// Why canvas, not DOM nodes:
//   - 150+ particles in DOM tank scroll perf on mid-tier Androids.
//   - One <canvas>, one rAF loop, draws rotated rects in a tight pass.
//   - Auto-cleans after `duration` and unmounts itself — no leaked timers.
//
// Visual: small colored squares burst outward from two emitters
// (center + top), with gravity and fade, modeled on Flipkart / Amazon order
// success bursts.

import { useEffect, useRef } from 'react';

// Modern, premium palette: brand green + brand gold + a few high-energy
// accents that read on white. No dull greys.
const COLORS = [
  '#0E2A22', // brand green
  '#1F4A3C',
  '#C8A951', // brand gold
  '#FBBF24', // amber
  '#2563EB', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F97316', // orange
];

const DURATION_MS = 2600;

function rand(min, max) { return Math.random() * (max - min) + min; }

function makeParticle(originX, originY, spreadAngleDeg, speedMin, speedMax) {
  const angle = (spreadAngleDeg + rand(-90, 90)) * (Math.PI / 180);
  const speed = rand(speedMin, speedMax);
  return {
    x: originX,
    y: originY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.25, 0.25),
    size: rand(5, 9),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    life: 0,
    maxLife: rand(1400, 2400),
  };
}

export default function ConfettiBurst({ onDone }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for perf
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Two emitters: top-center (firecracker upward) and center (radial burst).
    // Each fires immediately. We don't continuously spawn — one big burst
    // keeps the loop short and cheap.
    const centerX = w / 2;
    const centerY = h * 0.45;
    const topX = w / 2;
    const topY = h * 0.08;

    const particles = [];
    // Radial burst from center: 90 particles, full 360°.
    for (let i = 0; i < 90; i += 1) {
      const angle = (i / 90) * 360;
      particles.push(makeParticle(centerX, centerY, angle - 90, 3, 7));
    }
    // Upward burst from top: 60 particles, narrower spread, more upward.
    for (let i = 0; i < 60; i += 1) {
      particles.push(makeParticle(topX, topY, 90, 4, 8));
    }
    particlesRef.current = particles;

    const GRAVITY = 0.12;
    const DRAG = 0.992;

    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const dt = 16; // assume ~60fps for stable physics regardless of frame rate

      ctx.clearRect(0, 0, w, h);

      let alive = 0;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        if (p.life >= p.maxLife) continue;
        alive += 1;

        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.vy *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life += dt;

        // Fade out over the last third of the particle's life.
        const fadeStart = p.maxLife * 0.66;
        const alpha = p.life < fadeStart
          ? 1
          : Math.max(0, 1 - (p.life - fadeStart) / (p.maxLife - fadeStart));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
        ctx.restore();
      }

      if (elapsed < DURATION_MS && alive > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDone?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[90]"
      aria-hidden="true"
    />
  );
}
