'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent if email exists');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 shopping-icons-bg">
        <div className="w-full max-w-md">
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-brand-green/10">
            <div className="bg-brand-green px-8 py-8 text-center">
              <h1 className="font-serif text-3xl font-bold text-white">Check Your Email</h1>
            </div>
            <div className="bg-white dark:bg-gray-900 px-8 md:px-10 py-8 md:py-10 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                If an account exists with that email, we&apos;ve sent a password reset link.
              </p>
              <Link href="/auth/login" className="btn-secondary inline-block">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 shopping-icons-bg">
      <div className="w-full max-w-md">
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-brand-green/10">
          <div className="bg-brand-green px-8 py-8 text-center">
            <h1 className="font-serif text-3xl font-bold text-white">Forgot Password</h1>
            <p className="text-gray-300 mt-1.5 text-sm">Enter your email to receive a reset link</p>
          </div>

          <div className="bg-white dark:bg-gray-900 px-8 md:px-10 py-8 md:py-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <p className="text-center text-sm">
              <Link href="/auth/login" className="text-brand-green dark:text-brand-gold font-semibold hover:underline">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
