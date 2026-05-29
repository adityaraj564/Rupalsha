'use client';

// SpinModal — drives one spin session end-to-end:
//   1. shows the wheel idle with a CTA
//   2. on click, hits the right /api/spin/* endpoint
//   3. animates the wheel to the server-returned winning index
//   4. shows the result + close
//
// The server is the source of truth for the outcome. We render the visual
// to match the index it sends back so the spin always feels "fair" — the
// wheel can never land somewhere different from the announced prize.

import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { spinAPI } from '@/lib/api';
import { gaEvent } from '@/lib/analytics';
import SpinWheel from './SpinWheel';
import toast from 'react-hot-toast';

const HEADLINES = {
  welcome: {
    title: 'Welcome to Rupalsha ✨',
    sub: 'Spin the wheel — every new shopper wins',
    cta: 'Spin to Win',
  },
  post_purchase: {
    title: 'Thanks for shopping with us 💖',
    sub: 'Spin again to unlock a wallet reward',
    cta: 'Spin Now',
  },
  comeback: {
    title: 'We missed you ✨',
    sub: 'Spin to claim a comeback reward',
    cta: 'Spin Now',
  },
};

export default function SpinModal({
  type,
  segments = [],
  orderId,
  orderNumber,
  returnWindowDays = 7,
  onClose,
}) {
  const [phase, setPhase] = useState('idle');   // idle | spinning | done
  const [winningIndex, setWinningIndex] = useState(0);
  const [result, setResult] = useState(null);   // { amount, outcome, message }

  const copy = HEADLINES[type] || HEADLINES.welcome;

  const handleSpin = async () => {
    if (phase !== 'idle') return;
    setPhase('spinning');
    try {
      const res =
        type === 'welcome' ? await spinAPI.welcome()
        : type === 'comeback' ? await spinAPI.comeback()
        : await spinAPI.postPurchase(orderId);

      setWinningIndex(res.segment.index);
      setResult({
        amount: res.segment.amount,
        outcome: res.spin.outcome,
        message: res.message,
      });
      gaEvent('spin_completed', {
        spin_type: type,
        outcome: res.spin.outcome,
        amount: res.segment.amount,
      });
    } catch (err) {
      // Common 409s: already spun. Close gracefully without scaring the user.
      const msg = err?.message || 'Spin unavailable right now';
      toast.error(msg);
      setPhase('idle');
      onClose?.();
    }
  };

  const handleWheelStop = () => {
    setPhase('done');
  };

  const isWin = result?.amount > 0;
  const isDeferred = type === 'post_purchase' && isWin;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-brand-charcoal rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 relative">
        <button
          onClick={() => onClose?.(result ? { outcome: result.outcome } : null)}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white"
          // Don't let the user close mid-animation — the server has already
          // recorded the outcome and we want them to see what they won.
          disabled={phase === 'spinning'}
        >
          <FiX size={22} />
        </button>

        <div className="text-center mb-6">
          <h2 className="font-serif text-2xl font-bold text-brand-charcoal dark:text-white">
            {phase === 'done' ? (isWin ? `You won ₹${result.amount}!` : 'Better luck next time') : copy.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
            {phase === 'done'
              ? isDeferred
                ? `₹${result.amount} will be credited to your Rupalsha Wallet ${returnWindowDays} days after order ${orderNumber || ''} is delivered.`
                : isWin
                  ? 'Your wallet has been credited. Use it on your next order.'
                  : 'Stay tuned — more spins are on the way.'
              : copy.sub}
          </p>
        </div>

        <SpinWheel
          segments={segments}
          winningIndex={winningIndex}
          spinning={phase === 'spinning'}
          onFinish={handleWheelStop}
        />

        <div className="mt-8 text-center">
          {phase === 'idle' && (
            <button
              onClick={handleSpin}
              className="btn-primary px-8 py-3 text-base font-semibold"
            >
              {copy.cta}
            </button>
          )}
          {phase === 'spinning' && (
            <p className="text-sm text-gray-400">Spinning…</p>
          )}
          {phase === 'done' && (
            <button
              onClick={() => onClose?.({ outcome: result.outcome })}
              className="btn-primary px-8 py-3 text-base font-semibold"
            >
              {isWin ? 'Awesome!' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
