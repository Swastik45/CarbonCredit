'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, Building, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('FARMER');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, companyName, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to complete registration.');
        setLoading(false);
        return;
      }

      setOtpEmail(data.email || email);
      setSuccess(data.message || 'Verification code sent to your email.');
      setShowOtpModal(true);
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

      setSuccess('Account verified successfully! Redirecting to dashboard...');
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
      setError(err?.message || 'Failed to resend code.');
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
          <h2 className="text-2xl font-extrabold text-white mt-1">Create Carbon Account</h2>
          <p className="text-xs text-carbon-300 mt-1">Join the net-zero certified carbon exchange</p>
        </div>

        {/* Admin Auto-detect Banner */}
        {email.trim().toLowerCase() === 'psamarpaudel@gmail.com' && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">Admin privileges will be auto-granted for this email address.</span>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && !showOtpModal && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-carbon-300 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-red-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl input-field text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-carbon-300 uppercase tracking-wider mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-red-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl input-field text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-carbon-300 uppercase tracking-wider mb-1.5">
              Company / Entity Name (Optional)
            </label>
            <div className="relative">
              <Building className="w-5 h-5 text-red-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl input-field text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-carbon-300 uppercase tracking-wider mb-1.5">
              Account Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl input-field text-sm font-bold bg-[#080e0b]"
            >
              <option value="FARMER">Farmer / Reforestation Landowner</option>
              <option value="BUSINESS">Business Corporate Buyer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-carbon-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-emerald-400/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-2.5 rounded-xl input-field text-sm font-medium"
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
            className="w-full py-3.5 px-4 rounded-xl font-bold gradient-btn text-sm shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Register & Send Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-carbon-900 text-center text-xs text-carbon-300">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 font-bold hover:underline">
            Sign In
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
              <h3 className="text-lg font-bold text-white">Enter Email Verification Code</h3>
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
                {loading ? 'Verifying...' : 'Verify & Activate Account'}
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
                  className="text-carbon-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
