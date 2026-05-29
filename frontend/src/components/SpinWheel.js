'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Visual segment palette. Cycles in order — looks intentional for any wheel
// length up to ~8 segments. Picked to feel premium (warm brand tones + a
// muted "Better Luck" slate so losses don't visually pop).
const COLORS = [
  '#E6A8A0', // dusty rose
  '#C9A36C', // brand-gold
  '#7B9F7E', // muted sage
  '#D9B382', // warm sand
  '#A88BB0', // soft mauve
  '#6E8FB0', // dusty blue
  '#B98A5C', // toffee
];
const LOSS_COLOR = '#94A3B8'; // slate-400 — visually quieter for "Better Luck"

// Animated wheel rendered with CSS rotation. Caller passes:
//   - segments: [{ label, amount }]
//   - winningIndex: number — server-decided slice the pointer must land on
//   - spinning: boolean — when true, animate to winningIndex; when false, idle
//   - onFinish: callback fired after the rotation transition ends
// The wheel does NOT decide the outcome itself; the server is the source of
// truth and the client just plays the visual that matches.
export default function SpinWheel({ segments = [], winningIndex = 0, spinning = false, onFinish }) {
  const [rotation, setRotation] = useState(0);
  const finishCalled = useRef(false);
  const sliceAngle = 360 / Math.max(segments.length, 1);

  // When `spinning` flips true, compute a final rotation that:
  //   1) does at least 5 full turns (drama)
  //   2) lands the centre of the winning slice under the top pointer
  useEffect(() => {
    if (!spinning) return;
    finishCalled.current = false;
    const fullTurns = 5 + Math.floor(Math.random() * 3); // 5..7 turns
    const targetSliceCentre = winningIndex * sliceAngle + sliceAngle / 2;
    // Wheel rotates clockwise. Pointer is at top (0°). We want the slice
    // centre to align with the pointer, so rotate by -targetSliceCentre
    // modulo 360, plus the full turns.
    const finalAngle = fullTurns * 360 + (360 - targetSliceCentre);
    // Reset to 0 first (without transition) so consecutive spins always
    // animate from a clean state. Trick: temporarily disable transition.
    setRotation(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setRotation(finalAngle));
    });
  }, [spinning, winningIndex, sliceAngle]);

  const handleTransitionEnd = () => {
    if (finishCalled.current || !spinning) return;
    finishCalled.current = true;
    onFinish?.();
  };

  // Build the conic-gradient slices once per segment-set.
  const conicBackground = useMemo(() => {
    if (segments.length === 0) return '#eee';
    const stops = segments.map((seg, i) => {
      const colour = seg.amount > 0 ? COLORS[i % COLORS.length] : LOSS_COLOR;
      const from = i * sliceAngle;
      const to = (i + 1) * sliceAngle;
      return `${colour} ${from}deg ${to}deg`;
    });
    return `conic-gradient(from -${sliceAngle / 2}deg, ${stops.join(', ')})`;
  }, [segments, sliceAngle]);

  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto select-none">
      {/* Pointer (sits above the wheel, points down into the winning slice) */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-20">
        <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-brand-charcoal drop-shadow" />
      </div>

      {/* Wheel */}
      <div
        className="absolute inset-0 rounded-full shadow-2xl ring-4 ring-white"
        style={{
          background: conicBackground,
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 4.5s cubic-bezier(0.17, 0.67, 0.24, 1)' : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Segment labels — positioned radially around the wheel */}
        {segments.map((seg, i) => {
          const angle = i * sliceAngle + sliceAngle / 2;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-left text-white font-semibold text-sm pointer-events-none"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translate(35%, 0) rotate(90deg)`,
                width: 0,
              }}
            >
              <div
                className="whitespace-nowrap text-center -translate-y-1/2"
                style={{ transform: 'translateX(-50%) translateY(-110px)' }}
              >
                {seg.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Centre hub */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white shadow-inner flex items-center justify-center z-10">
        <span className="text-xl">✨</span>
      </div>
    </div>
  );
}
