'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiPlus, FiArrowDownLeft, FiArrowUpRight } from 'react-icons/fi';
import { walletAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const SOURCE_LABELS = {
  recharge: 'Recharge',
  refund: 'Refund',
  order_payment: 'Order payment',
  order_refund: 'Order refund',
  admin_credit: 'Admin credit',
  admin_debit: 'Admin adjustment',
};

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

export default function WalletPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    load();
  }, [isAuthenticated, isLoading]);

  const load = async () => {
    setLoading(true);
    try {
      const { balance, transactions } = await walletAPI.get();
      setBalance(balance);
      setTransactions(transactions);
    } catch (err) {
      toast.error(err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });

  const onRecharge = async (e) => {
    e?.preventDefault?.();
    const amount = Number(rechargeAmount);
    if (!amount || amount < 100) {
      toast.error('Minimum recharge is ₹100');
      return;
    }
    setProcessing(true);
    try {
      await loadRazorpay();
      const data = await walletAPI.rechargeCreate(amount);

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'Rupalsha',
        description: `Wallet recharge ₹${amount}`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            await walletAPI.rechargeVerify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              transactionId: data.transactionId,
            });
            toast.success(`₹${amount} added to your wallet`);
            setRechargeAmount('');
            await load();
          } catch (err) {
            toast.error(err.message || 'Verification failed. If money was deducted, contact support.');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast('Recharge cancelled', { icon: '⚠️' });
          },
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#1F3A2F' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setProcessing(false);
        toast.error('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err) {
      setProcessing(false);
      toast.error(err.message || 'Failed to initiate recharge');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-gray-500 hover:text-brand-green">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-charcoal dark:text-white">
          Rupalsha Wallet
        </h1>
      </div>

      {/* Balance */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-green via-emerald-700 to-green-900 dark:from-yellow-400 dark:via-amber-400 dark:to-yellow-500 text-white dark:text-gray-900 rounded-2xl p-6 mb-6 shadow-lg dark:shadow-amber-900/40">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 dark:bg-gray-900/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-white/10 dark:bg-gray-900/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm text-white/80 dark:text-gray-900/80">Current balance</p>
          <p className="font-serif text-4xl font-bold mt-1">
            {loading ? '—' : `₹${balance.toLocaleString('en-IN')}`}
          </p>
          <p className="text-xs text-white/70 dark:text-gray-900/70 mt-2">
            Use your balance at checkout for instant payments.
          </p>
        </div>
      </div>

      {/* Recharge */}
      <div className="card p-6 mb-6">
        <h2 className="font-serif text-lg font-semibold mb-3">Add money</h2>
        <form onSubmit={onRecharge} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => {
              const active = rechargeAmount === String(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setRechargeAmount(String(a))}
                  className={`px-4 py-2 border rounded-lg text-sm transition-colors ${
                    active
                      ? 'border-brand-green bg-brand-green/10 text-brand-green dark:border-yellow-400 dark:bg-yellow-400 dark:text-gray-900'
                      : 'hover:border-brand-green hover:text-brand-green dark:border-gray-700 dark:hover:border-yellow-400 dark:hover:text-yellow-300'
                  }`}
                >
                  ₹{a}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="number"
                min={100}
                max={50000}
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="Enter amount (₹100 – ₹50,000)"
                className="w-full border rounded-lg px-4 py-2.5 bg-white dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <button
              type="submit"
              disabled={processing || !rechargeAmount}
              className="px-5 py-2.5 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60 inline-flex items-center gap-2 dark:bg-gradient-to-r dark:from-yellow-400 dark:to-amber-500 dark:text-gray-900 dark:hover:from-yellow-300 dark:hover:to-amber-400 dark:shadow-lg dark:shadow-amber-900/30"
            >
              <FiPlus size={16} />
              {processing ? 'Processing...' : 'Recharge'}
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Recharge is credited to your wallet within 2 hours of successful payment.
        </p>
      </div>

      {/* Transactions */}
      <div className="card p-6">
        <h2 className="font-serif text-lg font-semibold mb-4">Recent transactions</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <ul className="divide-y dark:divide-gray-800">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'credit';
              const Icon = isCredit ? FiArrowDownLeft : FiArrowUpRight;
              return (
                <li key={tx._id} className="py-3 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCredit
                        ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/30'
                        : 'bg-red-100 text-red-700 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-1 dark:ring-rose-500/30'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.description || SOURCE_LABELS[tx.source] || tx.source}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {tx.status === 'pending' && ' • Pending'}
                      {tx.status === 'failed' && ' • Failed'}
                    </p>
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      isCredit ? 'text-green-700 dark:text-emerald-300' : 'text-red-700 dark:text-rose-300'
                    }`}
                  >
                    {isCredit ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN')}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
