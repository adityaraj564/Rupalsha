'use client';

// RewardModal — orchestrates the post-purchase scratch coupon. Renders
// the GPay-style fly-in card, lazy-resolves the prize on first scratch,
// fires a confetti burst on win, and exposes a single onClose callback to
// the controller.
//
// Flow:
//   1. Card flies in from the bottom with a 3D tilt (GPay "card present"
//      animation). NO server call yet.
//   2. First scratch interaction triggers POST /api/rewards/post-purchase
//      which locks the outcome server-side. Until the response arrives the
//      prize layer shows a spinner.
//   3. User keeps scratching. At ~45% revealed (and only after the server
//      has returned), ScratchCard auto-clears and a yellow Continue button
//      appears.
//
// Why lazy:
//   - If the user closes the modal without scratching, no reward is
//     recorded. The order stays eligible so they can claim it later from
//     the /rewards page. No silent prize is credited without their action.

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { rewardsAPI } from '@/lib/api';
import { gaEvent } from '@/lib/analytics';
import ScratchCard from './ScratchCard';
import ConfettiBurst from './ConfettiBurst';
import toast from 'react-hot-toast';

const COPY = {
  eyebrow: 'Order Reward',
  title: 'Thank You',
  sub: 'Scratch to reveal your wallet bonus.',
};

export default function RewardModal({
  orderId,
  orderNumber,
  returnWindowDays = 7,
  onClose,
}) {
  const [prize, setPrize] = useState(null); // { amount, outcome }
  const [resolving, setResolving] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState(false);
  const resolveStartedRef = useRef(false);

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Fired when the user starts the very first scratch. Locks the prize on
  // the server and stores it for the reveal step. Guarded by a ref so
  // double-fast taps can't double-spend.
  const resolvePrize = useCallback(async () => {
    if (resolveStartedRef.current) return;
    resolveStartedRef.current = true;
    setResolving(true);
    try {
      const res = await rewardsAPI.postPurchase(orderId);

      setPrize({ amount: res.segment.amount, outcome: res.reward.outcome });
      gaEvent('reward_revealed', {
        reward_type: 'post_purchase',
        outcome: res.reward.outcome,
        amount: res.segment.amount,
      });
    } catch (err) {
      toast.error(err?.message || 'Reward unavailable right now');
      setError(true);
      onClose?.();
    } finally {
      setResolving(false);
    }
  }, [orderId, onClose]);

  if (error) return null;

  const isWin = (prize?.amount ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
      style={{
        // Soft warm beige wash — premium, not theatrical.
        background:
          'linear-gradient(180deg, rgba(232,220,203,0.55) 0%, rgba(0,0,0,0.55) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        perspective: '1200px',
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Full-viewport confetti burst when the user wins. Mounts only on
          reveal so the canvas work doesn't happen for losses. */}
      {revealed && isWin && <ConfettiBurst />}

      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden
                   bg-white dark:bg-[#0f1622]
                   ring-1 ring-slate-200 dark:ring-slate-800
                   animate-card-fly"
        style={{
          transformStyle: 'preserve-3d',
          boxShadow:
            '0 30px 60px -20px rgba(15, 23, 42, 0.35), 0 8px 20px -8px rgba(15, 23, 42, 0.15)',
        }}
      >
        {/* Close */}
        <button
          onClick={() => onClose?.(prize ? { outcome: prize.outcome } : null)}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                     dark:bg-slate-800 dark:hover:bg-slate-700
                     text-slate-500 dark:text-slate-300
                     flex items-center justify-center transition"
        >
          <FiX size={16} />
        </button>

        {/* Header */}
        <div className="text-center pt-8 pb-2 px-6">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-blue-600 dark:text-blue-400">
            {COPY.eyebrow}
          </p>
          <h2 className="font-serif text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
            {COPY.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {COPY.sub}
          </p>
        </div>

        {/* Scratch card */}
        <div className="px-6 pt-6 pb-6">
          <ScratchCard
            amount={prize?.amount ?? 0}
            loading={resolving || !prize}
            onFirstScratch={resolvePrize}
            onRevealed={() => setRevealed(true)}
          />

          {/* Footer */}
          <div className="mt-7 text-center min-h-[44px]">
            {revealed ? (
              <>
                {isWin && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 px-2 leading-relaxed">
                    Credits to your wallet {returnWindowDays} days after delivery
                    {orderNumber ? ` of ${orderNumber}` : ''}.
                  </p>
                )}
                <button
                  onClick={() => onClose?.({ outcome: prize?.outcome })}
                  className={`w-full px-7 py-3 rounded-xl text-sm font-bold transition-all
                              tracking-wider uppercase
                              ${isWin
                                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5 active:translate-y-0'
                                : 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 hover:opacity-90'}`}
                >
                  {isWin ? 'Continue' : 'Close'}
                </button>
              </>
            ) : (
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-[0.18em] uppercase animate-pulse">
                {resolving ? 'Unlocking your reward'
                  : prize ? 'Keep scratching to reveal'
                  : 'Scratch the card to begin'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* GPay-style card-present animation */}
      <style jsx global>{`
        @keyframes card-fly {
          0%   { transform: translateY(110vh) rotateX(70deg) scale(0.55); opacity: 0; }
          55%  { transform: translateY(-14px) rotateX(-8deg) scale(1.02); opacity: 1; }
          80%  { transform: translateY(4px) rotateX(3deg) scale(0.995); }
          100% { transform: translateY(0) rotateX(0deg) scale(1); opacity: 1; }
        }
        .animate-card-fly {
          animation: card-fly 0.85s cubic-bezier(0.2, 0.7, 0.25, 1) both;
          transform-origin: 50% 100%;
        }
      `}</style>
    </div>
  );
}
