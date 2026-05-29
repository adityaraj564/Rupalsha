'use client';

// ScratchCard — GPay-style scratchable reward card.
//
// A canvas overlay sits on top of the prize layer; the user drags a finger /
// cursor across it and we paint with composite "destination-out" to erase
// pixels and reveal what's underneath. When the scratched area passes a
// threshold (~45%), we auto-clear the rest so the user doesn't have to
// scrub every corner, exactly like GPay does.

import { useEffect, useRef, useState } from 'react';

const WIDTH = 280;
const HEIGHT = 200;
const REVEAL_THRESHOLD = 0.45;
const BRUSH_RADIUS = 22;

export default function ScratchCard({ amount = 0, loading = false, onFirstScratch, onRevealed }) {
  const canvasRef = useRef(null);
  const revealedRef = useRef(false);
  const firedFirstScratchRef = useRef(false);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [revealed, setRevealed] = useState(false);

  const isWin = amount > 0;

  // Paint the blue scratch surface once the canvas is mounted.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Deep modern blue gradient.
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1E3A8A');
    grad.addColorStop(0.55, '#1D4ED8');
    grad.addColorStop(1, '#2563EB');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle diagonal sheen — pure white at very low alpha, no garish foil.
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 7);
    for (let x = -width; x < width; x += 36) {
      ctx.fillRect(x, -height, 14, height * 2);
    }
    ctx.restore();

    // Hint — text only, no emoji. Clean uppercase tracking like Stripe / Apple.
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '600 13px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px'; // not supported everywhere; the visual is mainly carried by the spaced string below
    ctx.fillText('SCRATCH TO REVEAL', width / 2, height / 2 - 8);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '500 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('Drag across the card', width / 2, height / 2 + 14);
  }, []);

  // Sample alpha channel on a coarse grid to estimate scratched fraction.
  const computeCleared = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const stride = 8;
    const data = ctx.getImageData(0, 0, width, height).data;
    let clear = 0;
    let total = 0;
    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const idx = (y * width + x) * 4 + 3;
        if (data[idx] === 0) clear += 1;
        total += 1;
      }
    }
    return clear / total;
  };

  const finishReveal = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transition = 'opacity 0.4s ease';
      canvas.style.opacity = '0';
    }
    setRevealed(true);
    onRevealed?.();
  };

  const scratchAt = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas || revealedRef.current) return;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    const last = lastPointRef.current;
    if (last) {
      ctx.lineWidth = BRUSH_RADIUS * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastPointRef.current = { x, y };
  };

  const getPos = (evt) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = evt.touches ? evt.touches[0] : evt;
    return {
      x: ((point.clientX - rect.left) / rect.width) * canvas.width,
      y: ((point.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleStart = (e) => {
    e.preventDefault();
    if (revealedRef.current) return;
    // Notify parent on the very first scratch — used to lazily resolve the
    // prize server-side. This means closing the modal without scratching
    // leaves the user's eligibility untouched.
    if (!firedFirstScratchRef.current) {
      firedFirstScratchRef.current = true;
      onFirstScratch?.();
    }
    drawingRef.current = true;
    lastPointRef.current = null;
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };

  const handleMove = (e) => {
    if (!drawingRef.current || revealedRef.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    scratchAt(x, y);
    if (!handleMove._tick) handleMove._tick = 0;
    handleMove._tick += 1;
    // Only auto-reveal once the server has returned the prize — we can't
    // animate the canvas away before there's something to show underneath.
    if (handleMove._tick % 6 === 0 && !loading) {
      if (computeCleared() >= REVEAL_THRESHOLD) finishReveal();
    }
  };

  const handleEnd = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  return (
    <div
      className="relative mx-auto select-none rounded-2xl overflow-hidden"
      style={{
        width: WIDTH,
        height: HEIGHT,
        boxShadow: '0 12px 32px -8px rgba(30, 58, 138, 0.35), 0 2px 6px rgba(0,0,0,0.05)',
      }}
    >
      {/* Prize layer — clean white with a thin blue rule, very Stripe/Linear */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 bg-white dark:bg-[#0f1622]">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 rounded-full border-[3px] border-blue-100 border-t-blue-600 animate-spin" />
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400">
              Loading
            </p>
          </div>
        ) : isWin ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-blue-600 dark:text-blue-400">
              You Won
            </p>
            <p className="font-serif text-[56px] leading-none font-extrabold text-slate-900 dark:text-white mt-2">
              ₹{amount}
            </p>
            <div className="mt-3 h-px w-12 bg-slate-200 dark:bg-slate-700" />
            <p className="text-[11px] mt-3 font-medium text-slate-500 dark:text-slate-400">
              Added to your Rupalsha Wallet
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-slate-400">
              Result
            </p>
            <p className="font-serif text-xl font-bold text-slate-700 dark:text-slate-200 mt-2">
              Better Luck Next Time
            </p>
            <div className="mt-3 h-px w-12 bg-slate-200 dark:bg-slate-700" />
            <p className="text-[11px] mt-3 text-slate-400">More rewards coming soon</p>
          </>
        )}
      </div>

      {/* Scratch canvas overlay — always shown, even while server is
          resolving the prize. The user can start scratching immediately
          for a snappy feel; auto-reveal waits until `loading` is false. */}
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </div>
  );
}
