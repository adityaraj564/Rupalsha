'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiMail, FiLock, FiX } from 'react-icons/fi';

const BIOMETRIC_KEY = 'rupalsha_biometric_email';

const getBiometricEmail = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(BIOMETRIC_KEY) || null;
  } catch {
    return null;
  }
};

const setBiometricEmail = (email) => {
  if (typeof window === 'undefined') return;
  try {
    if (email) localStorage.setItem(BIOMETRIC_KEY, email);
    else localStorage.removeItem(BIOMETRIC_KEY);
  } catch {
    // ignore
  }
};

export default function LoginPage() {
  const [mode, setMode] = useState('password');

  // Password mode
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP mode
  const [otpEmail, setOtpEmail] = useState('');
  const [otpStep, setOtpStep] = useState('email');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpInputRef = useRef(null);

  // Biometric
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false); // for current saved email
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [autoPromptDone, setAutoPromptDone] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingUser, setPendingUser] = useState(null); // user just signed in via password
  const [savePromptBusy, setSavePromptBusy] = useState(false);

  const login = useAuthStore((s) => s.login);
  const loginWithToken = useAuthStore((s) => s.loginWithToken);
  const router = useRouter();

  // ----- Biometric support detection + auto-prompt on mount -----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { browserSupportsWebAuthn } = await import('@simplewebauthn/browser');
        if (cancelled) return;
        const supported = browserSupportsWebAuthn();
        setBiometricSupported(supported);
        const savedEmail = getBiometricEmail();
        if (supported && savedEmail) {
          setBiometricEnabled(true);
          setEmail(savedEmail);
          // Auto-trigger biometric prompt once when the page opens
          setTimeout(() => triggerBiometricLogin(savedEmail, true), 350);
        }
      } catch {
        setBiometricSupported(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Resend timer -----
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

  // ----- Biometric login flow -----
  const triggerBiometricLogin = async (forEmail, isAutoTrigger = false) => {
    if (!biometricSupported && typeof window !== 'undefined') {
      // Re-check in case state hasn't settled yet
      try {
        const { browserSupportsWebAuthn } = await import('@simplewebauthn/browser');
        if (!browserSupportsWebAuthn()) {
          if (!isAutoTrigger) toast.error('Your browser does not support biometrics');
          return;
        }
      } catch {
        return;
      }
    }
    if (biometricBusy) return;
    if (isAutoTrigger && autoPromptDone) return;
    setAutoPromptDone(true);
    setBiometricBusy(true);
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const { options, sessionId } = await authAPI.passkeyLoginOptions(forEmail || undefined);
      const assertion = await startAuthentication({ optionsJSON: options });
      const { token, user } = await authAPI.passkeyLoginVerify({ response: assertion, sessionId });
      loginWithToken(token, user);
      toast.success(`Welcome back, ${user.name}!`);
      routeAfterLogin(user);
    } catch (err) {
      // User dismissed biometric prompt — silently fall back to password
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'AbortError' ||
        err?.message?.includes('cancel')
      ) {
        return;
      }
      // Non-fatal: clear flag if the saved email no longer has a passkey on this device
      if (err?.message?.toLowerCase().includes('not recognised')) {
        setBiometricEmail(null);
        setBiometricEnabled(false);
      }
      if (!isAutoTrigger) toast.error(err.message || 'Biometric sign-in failed');
    } finally {
      setBiometricBusy(false);
    }
  };

  // ----- Password login -----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({ email, password });
      toast.success(`Welcome back, ${user.name}!`);

      // Offer to save credentials for biometric login (only once per device per email)
      const alreadySaved = getBiometricEmail() === email;
      if (biometricSupported && !alreadySaved) {
        setPendingUser(user);
        setShowSavePrompt(true);
        // Don't redirect yet — wait for user's choice
      } else {
        routeAfterLogin(user);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ----- "Save for biometric login?" modal handlers -----
  const handleSaveBiometric = async () => {
    setSavePromptBusy(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const options = await authAPI.passkeyRegisterOptions();
      const attestation = await startRegistration({ optionsJSON: options });
      const deviceName = (() => {
        try {
          const ua = navigator.userAgent;
          if (/iPhone|iPad/.test(ua)) return 'iPhone (Face ID/Touch ID)';
          if (/Android/.test(ua)) return 'Android (Fingerprint)';
          if (/Mac/.test(ua)) return 'Mac (Touch ID)';
          if (/Windows/.test(ua)) return 'Windows Hello';
          return 'This device';
        } catch {
          return 'This device';
        }
      })();
      await authAPI.passkeyRegisterVerify({ response: attestation, name: deviceName });
      setBiometricEmail(email);
      setBiometricEnabled(true);
      toast.success('Biometric login enabled for this device');
      setShowSavePrompt(false);
      if (pendingUser) routeAfterLogin(pendingUser);
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        // user cancelled biometric prompt — proceed without saving
        setShowSavePrompt(false);
        if (pendingUser) routeAfterLogin(pendingUser);
        return;
      }
      toast.error(err.message || 'Could not enable biometric login');
      setShowSavePrompt(false);
      if (pendingUser) routeAfterLogin(pendingUser);
    } finally {
      setSavePromptBusy(false);
    }
  };

  const handleSkipBiometric = () => {
    setShowSavePrompt(false);
    if (pendingUser) routeAfterLogin(pendingUser);
  };

  // ----- OTP -----
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

  // ----- Email field focus → re-trigger biometric (per spec) -----
  const handleEmailFocus = () => {
    if (autoPromptDone) return;
    if (!biometricEnabled || !biometricSupported) return;
    const saved = getBiometricEmail();
    if (saved) triggerBiometricLogin(saved, true);
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

            {/* Quick biometric chip when enabled */}
            {biometricEnabled && biometricSupported && mode === 'password' && (
              <button
                type="button"
                onClick={() => triggerBiometricLogin(getBiometricEmail() || email)}
                disabled={biometricBusy}
                className="w-full mb-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-brand-green/30 bg-brand-green/5 dark:bg-brand-green/10 hover:bg-brand-green/10 dark:hover:bg-brand-green/20 text-sm font-medium text-brand-green dark:text-[#F5F1E9] transition disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 11V7a5 5 0 0 0-10 0v4" />
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                </svg>
                {biometricBusy ? 'Authenticating…' : 'Sign in with biometrics'}
              </button>
            )}

            {mode === 'password' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={handleEmailFocus}
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

      {/* Save-for-biometric modal */}
      {showSavePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-brand-green/10 dark:bg-brand-green/20 px-6 py-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-green/20 dark:bg-brand-green/30 flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green dark:text-[#F5F1E9]">
                    <path d="M17 11V7a5 5 0 0 0-10 0v4" />
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-brand-charcoal dark:text-white">Quick sign-in next time?</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use Face ID, Touch ID, or fingerprint</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSkipBiometric}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Save this device for biometric sign-in. Next time you visit, just unlock with your fingerprint or face — no password needed.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                You can disable this anytime from your profile.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={handleSkipBiometric}
                  disabled={savePromptBusy}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={handleSaveBiometric}
                  disabled={savePromptBusy}
                  className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-50"
                >
                  {savePromptBusy ? 'Setting up…' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
