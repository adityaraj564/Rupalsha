'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';

export default function LoginPage() {
  const [mode, setMode] = useState('password');

  // Password mode
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP mode
  const [otpEmail, setOtpEmail] = useState('');
  const [otpStep, setOtpStep] = useState('email'); // 'email' | 'verify'
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpInputRef = useRef(null);

  const login = useAuthStore((s) => s.login);
  const loginWithToken = useAuthStore((s) => s.loginWithToken);
  const router = useRouter();

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    if (otpStep === 'verify') {
      setTimeout(() => otpInputRef.current?.focus(), 50);
    }
  }, [otpStep]);

  const routeAfterLogin = (user) => {
    router.push(
      user.role === 'admin'
        ? '/admin'
        : user.role === 'subadmin'
        ? '/content-admin'
        : '/'
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({ email, password });
      toast.success(`Welcome back, ${user.name}!`);
      routeAfterLogin(user);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e?.preventDefault?.();
    if (!otpEmail) return;
    setOtpLoading(true);
    try {
      await authAPI.requestLoginOtp(otpEmail);
      toast.success('If the account exists, a login code has been sent.');
      setOtpStep('verify');
      setOtp('');
      setResendIn(30);
    } catch (err) {
      toast.error(err.message || 'Could not send code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setOtpLoading(true);
    try {
      const { token, user } = await authAPI.verifyLoginOtp({ email: otpEmail, otp });
      loginWithToken(token, user);
      toast.success(`Welcome back, ${user.name}!`);
      routeAfterLogin(user);
    } catch (err) {
      toast.error(err.message || 'Invalid code');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 shopping-icons-bg">
      <div className="w-full max-w-md">
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-brand-green/10">
          <div className="bg-brand-green px-8 py-8 text-center">
            <h1 className="font-serif text-3xl font-bold text-white">Welcome Back</h1>
            <p className="text-gray-300 mt-1.5 text-sm">Sign in to your Rupalsha account</p>
          </div>

          <div className="bg-white dark:bg-gray-900 px-8 md:px-10 py-8 md:py-10">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('password')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                  mode === 'password'
                    ? 'bg-white dark:bg-gray-900 text-brand-charcoal dark:text-white shadow'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <FiLock size={14} /> Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('otp');
                  setOtpStep('email');
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                  mode === 'otp'
                    ? 'bg-white dark:bg-gray-900 text-brand-charcoal dark:text-white shadow'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <FiMail size={14} /> Email OTP
              </button>
            </div>

            {mode === 'password' && (
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pr-12"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link href="/auth/forgot-password" className="text-sm text-brand-gold hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {mode === 'otp' && otpStep === 'email' && (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    className="input-field"
                    placeholder="your@email.com"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    We&apos;ll send a 6-digit login code to your email.
                  </p>
                </div>

                <button type="submit" className="btn-primary w-full" disabled={otpLoading}>
                  {otpLoading ? 'Sending code...' : 'Send Login Code'}
                </button>
              </form>
            )}

            {mode === 'otp' && otpStep === 'verify' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Code sent to <span className="font-medium text-brand-charcoal dark:text-gray-200">{otpEmail}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Enter 6-digit code
                  </label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="••••••"
                    maxLength={6}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary w-full" disabled={otpLoading || otp.length !== 6}>
                  {otpLoading ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('email');
                      setOtp('');
                    }}
                    className="text-gray-500 hover:text-brand-charcoal dark:hover:text-white"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={resendIn > 0 || otpLoading}
                    className="text-brand-gold hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-brand-green dark:text-brand-gold font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
