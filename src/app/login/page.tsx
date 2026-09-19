'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & OTP Modal states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresOtp) {
          setOtpEmail(data.email || email);
          setShowOtpModal(true);
          setError(data.error);
        } else {
          setError(data.error || 'Failed to sign in.');
        }
        setLoading(false);
        return;
      }

      setSuccess('Successfully signed in! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        setLoading(false);
        return;
      }

      setSuccess('Account verified! Redirecting to dashboard...');
      setShowOtpModal(false);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('A new verification code was sent to your email.');
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code.');
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('If an account exists, a reset code was dispatched.');
      setForgotStep('reset');
    } catch (err: any) {
      setError(err?.message || 'Failed to process request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('Password updated successfully! You can now sign in.');
      setShowForgotModal(false);
      setForgotStep('request');
    } catch (err: any) {
      setError(err?.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-world-root min-h-screen text-carbon-50 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Background Glow Orbs */}
      <div className="auth-world-backdrop" aria-hidden="true" />

      {/* Top Header Navigation bar for returning Home */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between z-20 pb-4">
        <Link
          href="/"
          className="auth-back-link"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Back to Main Home</span>
        </Link>

        <Link href="/" className="flex items-center gap-2">
          <div className="auth-brand-mark" />
          <span className="auth-brand-name">
            Carbon<span>Credit</span>
          </span>
        </Link>
      </header>

      {/* Card Form */}
      <div className="auth-form-stage max-w-md w-full mx-auto p-8 z-10 relative">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-white mt-1">Sign In to Account</h2>
          <p className="text-xs text-carbon-300 mt-1">Access your satellite-verified carbon credit portal</p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-carbon-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-emerald-400/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl input-field text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-carbon-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                className="text-xs text-emerald-400 hover:underline font-semibold"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-emerald-400/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-xl input-field text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-bold gradient-btn text-sm shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-carbon-900 text-center text-xs text-carbon-300">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-emerald-400 font-bold hover:underline">
            Create an account
          </Link>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-carbon-400/60">
        <Link href="/" className="hover:underline">Carbon Credit Registry Home</Link>
      </footer>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="auth-modal-stage max-w-sm w-full p-6 relative">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Enter Verification Code</h3>
              <p className="text-xs text-carbon-300 mt-1">
                We sent a 6-digit code to <span className="text-emerald-400 font-bold">{otpEmail}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full tracking-widest text-center text-xl py-3 rounded-xl input-field font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-3 rounded-xl font-bold gradient-btn text-sm disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Resend Code
                </button>

                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="text-carbon-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="auth-modal-stage max-w-sm w-full p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">Reset Password</h3>
            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <p className="text-xs text-carbon-300">
                  Enter your email address to receive a 6-digit password reset code.
                </p>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl input-field text-sm font-medium"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl font-bold gradient-btn text-sm"
                >
                  {loading ? 'Sending Code...' : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-carbon-300">
                  Enter the code sent to <span className="text-emerald-400 font-bold">{forgotEmail}</span> and choose a new password.
                </p>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl input-field text-sm tracking-wider text-center font-mono font-bold"
                />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl input-field text-sm font-medium"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl font-bold gradient-btn text-sm"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setShowForgotModal(false);
                setForgotStep('request');
              }}
              className="mt-4 text-xs text-carbon-400 hover:text-white block mx-auto font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
