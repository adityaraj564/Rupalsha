'use client';

import { useEffect, useRef, useState } from 'react';
import { FiX, FiEye, FiEyeOff, FiMail, FiLock, FiArrowLeft } from 'react-icons/fi';
import { useAuthStore, useAuthModalStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';

/**
 * Global login/register popup.
 *
 * Errors are rendered inline inside the form (no top-of-page toasts) so the
 * user sees feedback right next to the inputs they're editing. On success
 * the modal closes and any `pendingAction` (e.g. add-to-cart) resumes.
 */
export default function AuthModal() {
  const isOpen = useAuthModalStore((s) => s.isOpen);
  const mode = useAuthModalStore((s) => s.mode);
  const setMode = useAuthModalStore((s) => s.setMode);
  const close = useAuthModalStore((s) => s.close);
  const resolve = useAuthModalStore((s) => s.resolve);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loginWithToken = useAuthStore((s) => s.loginWithToken);

  // Login state
  const [authMode, setAuthMode] = useState('password'); // 'password' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpStep, setOtpStep] = useState('email'); // 'email' | 'verify'
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const otpInputRef = useRef(null);

  // Register state
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot-password state — handled inline in the same popup so the user
  // never leaves the page they were on.
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Wipe every credential the moment the modal closes. This matters on
  // shared / public devices: if a user typed an email + password and then
  // dismissed the popup, leaving the values in state means the next time
  // anyone opens the modal those credentials are still pre-filled. Clear
  // everything (login, OTP, register) so each open starts fresh.
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setLoading(false);
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setOtpEmail('');
      setOtp('');
      setOtpStep('email');
      setResendIn(0);
      setRegisterForm({ name: '', email: '', password: '', phone: '' });
      setShowRegPassword(false);
      setAuthMode('password');
      setForgotEmail('');
      setForgotSent(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setError('');
  }, [mode, authMode, otpStep]);

  // Lock body scroll while the modal is open so the page underneath doesn't
  // jump when the user interacts with the form.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Close on Escape key.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // Resend countdown for OTP flow.
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

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      resolve();
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(registerForm);
      resolve();
    } catch (err) {
      setError(err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e?.preventDefault?.();
    if (!otpEmail) return;
    setError('');
    setLoading(true);
    try {
      await authAPI.requestLoginOtp(otpEmail);
      setOtpStep('verify');
      setOtp('');
      setResendIn(30);
    } catch (err) {
      setError(err.message || 'Could not send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authAPI.verifyLoginOtp({ email: otpEmail, otp });
      loginWithToken(token, user);
      resolve();
    } catch (err) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setError(err.message || 'Could not send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    try {
      const { token, user } = await authAPI.googleLogin(credential);
      loginWithToken(token, user);
      resolve();
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop — clicking it closes the modal but keeps the user on the
          same page (no navigation). */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl shadow-brand-green/30 bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="bg-brand-green px-6 py-5 text-center relative">
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <FiX size={18} />
          </button>
          <h1 id="auth-modal-title" className="font-serif text-2xl font-bold text-white">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && (forgotSent ? 'Check Your Email' : 'Forgot Password')}
          </h1>
          <p className="text-gray-300 mt-1 text-xs">
            {mode === 'login' && 'Sign in to continue shopping'}
            {mode === 'register' && 'Join the Rupalsha family'}
            {mode === 'forgot' && !forgotSent && 'Enter your email to receive a reset link'}
            {mode === 'forgot' && forgotSent && 'We just sent you a reset link'}
          </p>
        </div>

        <div className="px-6 md:px-8 py-6">
          {/* Inline error — appears right above the form, never as a toast. */}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {mode === 'login' && (
            <>
              {/* Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 mb-5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setAuthMode('password'); setError(''); }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                    authMode === 'password'
                      ? 'bg-white dark:bg-gray-900 text-brand-charcoal dark:text-white shadow'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <FiLock size={14} /> Password
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('otp'); setOtpStep('email'); setError(''); }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                    authMode === 'otp'
                      ? 'bg-white dark:bg-gray-900 text-brand-charcoal dark:text-white shadow'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <FiMail size={14} /> Email OTP
                </button>
              </div>

              {authMode === 'password' && (
                <form onSubmit={handleLogin} className="space-y-4">
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
                        tabIndex={-1}
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setForgotEmail(email); setForgotSent(false); setError(''); }}
                      className="text-sm text-brand-gold hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              )}

              {authMode === 'otp' && otpStep === 'email' && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
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
                  <button type="submit" className="btn-primary w-full" disabled={loading}>
                    {loading ? 'Sending code...' : 'Send Login Code'}
                  </button>
                </form>
              )}

              {authMode === 'otp' && otpStep === 'verify' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Code sent to <span className="font-medium text-brand-charcoal dark:text-gray-200">{otpEmail}</span>
                  </p>
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
                  <button type="submit" className="btn-primary w-full" disabled={loading || otp.length !== 6}>
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setOtpStep('email'); setOtp(''); }}
                      className="text-gray-500 hover:text-brand-charcoal dark:hover:text-white"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={resendIn > 0 || loading}
                      className="text-brand-gold hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="input-field"
                  placeholder="Your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  className="input-field"
                  placeholder="9876543210"
                  pattern="[6-9][0-9]{9}"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="input-field pr-12"
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    tabIndex={-1}
                  >
                    {showRegPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && !forgotSent && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  We&apos;ll email you a link to reset your password.
                </p>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-brand-charcoal dark:hover:text-white pt-1"
              >
                <FiArrowLeft size={14} /> Back to login
              </button>
            </form>
          )}

          {mode === 'forgot' && forgotSent && (
            <div className="text-center space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                If an account exists for{' '}
                <span className="font-medium text-brand-charcoal dark:text-gray-200">{forgotEmail}</span>,
                we&apos;ve sent a password reset link. Please check your inbox.
              </p>
              <button
                type="button"
                onClick={() => { setMode('login'); setForgotSent(false); setError(''); }}
                className="btn-secondary w-full inline-flex items-center justify-center gap-1.5"
              >
                <FiArrowLeft size={14} /> Back to login
              </button>
            </div>
          )}

          {mode !== 'forgot' && (
          <>
          <div className="flex items-center gap-4 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <GoogleSignInButton
            onCredential={handleGoogleCredential}
            text={mode === 'login' ? 'continue_with' : 'signup_with'}
          />

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-5">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-brand-green dark:text-brand-gold font-semibold hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-brand-green dark:text-brand-gold font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
