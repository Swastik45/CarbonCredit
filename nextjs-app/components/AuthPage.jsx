'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// ── Password Strength Helper ──────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-teal-400'];
const STRENGTH_TEXT   = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-emerald-400', 'text-teal-400'];

// ── Input Component ───────────────────────────────────────
function FormInput({ label, name, type = 'text', value, onChange, placeholder, required, autoComplete, rightSlot }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-xs font-bold text-slate-300 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-500 text-sm"
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function AuthPage({ initialView = 'login' }) {
  const [view, setView] = useState(initialView); // 'login' | 'signup' | 'forgot'
  const [userType, setUserType] = useState('farmer');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Resend confirmation
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  // Forgot password sent state
  const [resetSent, setResetSent] = useState(false);

  // Dev mode
  const [skipEmail, setSkipEmail] = useState(false);

  const [formData, setFormData] = useState({
    identifier: '',   // login: username or email
    username: '',     // signup only
    email: '',        // signup + forgot
    password: '',
    confirmPassword: '',
  });

  const router = useRouter();
  const pwStrength = getPasswordStrength(formData.password);

  // ── URL message handling ──────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const msg = sp.get('message');
    if (msg === 'email_confirmed') setSuccess('✅ Email confirmed! You can now log in.');
    if (msg === 'password_reset')  setSuccess('✅ Password updated! Log in with your new password.');
    const err = sp.get('error');
    if (err === 'invalid_confirmation_link') setError('Invalid confirmation link. Please try again.');
    if (err === 'confirmation_failed')       setError('Email confirmation failed. Please register again.');
  }, []);

  // ── Reset form on view change ─────────────────────────
  const switchView = (to) => {
    setView(to);
    setError('');
    setSuccess('');
    setNeedsConfirmation(false);
    setResetSent(false);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  // ── Google OAuth ──────────────────────────────────────
  const handleGoogleOAuth = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingUserType', userType);
      }

      // Server-side: reads SUPABASE_SERVICE_ROLE_KEY
      const res = await fetch(`/api/auth/google?userType=${userType}`);
      const data = await res.json();

      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }

      setError(
        data.error ||
          'Google sign-in not configured. Enable Google in Supabase → Authentication → Providers.'
      );
    } catch {
      setError('Google sign-in error. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Resend confirmation email ─────────────────────────
  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return;
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: confirmationEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to resend.'); return; }
      setSuccess('Confirmation email sent! Check your inbox.');
      setError('');
    } catch {
      setError('Failed to resend email.');
    } finally {
      setResendLoading(false);
    }
  };

  // ── Main Form Submit ──────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setNeedsConfirmation(false);

    // Client-side validation
    if (view === 'signup') {
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
    }

    try {
      // ── LOGIN ────────────────────────────────────────
      if (view === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.identifier,   // accepts username OR email
            password: formData.password,
            userType,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.needsConfirmation) {
            setNeedsConfirmation(true);
            setConfirmationEmail(data.email);
            setError(data.message || 'Email not confirmed. Check your inbox.');
            return;
          }
          setError(data.error || 'Login failed. Please check your credentials.');
          return;
        }

        // Persist session to localStorage for dashboard auth checks and API calls
        if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
        if (data.userId)      localStorage.setItem('userId', data.userId);
        if (data.userType)    localStorage.setItem('userType', data.userType);
        if (data.username)    localStorage.setItem('username', data.username);

        router.push(`/dashboard/${data.userType}`);
      }

      // ── SIGN UP ──────────────────────────────────────
      else if (view === 'signup') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            userType,
            skipEmail,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.rateLimited) {
            setError('Too many attempts. Please wait a few minutes and try again.');
            return;
          }
          setError(data.error || 'Registration failed. Please try again.');
          return;
        }

        if (data.emailSent === false) {
          setSuccess('Account created! Redirecting to login...');
          setTimeout(() => switchView('login'), 1800);
        } else {
          setSuccess(
            '📬 Check your email! We sent a confirmation link to ' + formData.email + '.'
          );
        }
      }

      // ── FORGOT PASSWORD ──────────────────────────────
      else if (view === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to send reset email. Please try again.');
          return;
        }

        setResetSent(true);
        setSuccess('Password reset email sent — check your inbox (and spam folder).');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input class ────────────────────────────────
  const inputCls =
    'w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-500 text-sm';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-900 font-sans selection:bg-emerald-500 selection:text-white">

      {/* ── Left Branding Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-12 flex-col justify-between overflow-hidden border-r border-emerald-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none -mr-20 -mt-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -ml-10 -mb-10" />

        <Link href="/" className="relative z-10 text-white text-2xl font-black tracking-wider flex items-center gap-3 group">
          <span className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">🌱</span>
          <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">CarbonCredit</span>
        </Link>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Verified Eco Marketplace
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Accelerating the <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent italic font-serif">
              Green Economy.
            </span>
          </h2>
          <p className="text-slate-300/80 text-base leading-relaxed">
            Connect verified satellite-scanned plantations directly with enterprise buyers. High transparency, encrypted transactions, zero friction.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div><div className="text-2xl font-bold text-emerald-400">800+</div><div className="text-xs text-slate-400 uppercase tracking-wider">Farmers</div></div>
            <div><div className="text-2xl font-bold text-teal-400">12K+</div><div className="text-xs text-slate-400 uppercase tracking-wider">Tons CO₂</div></div>
            <div><div className="text-2xl font-bold text-emerald-300">100%</div><div className="text-xs text-slate-400 uppercase tracking-wider">Verified</div></div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-6">
          <span>© {new Date().getFullYear()} CarbonCredit Inc.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Security</a>
          </div>
        </div>

        <img
          src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=1000"
          alt="Forest overlay"
          className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-overlay pointer-events-none"
        />
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-900 text-slate-100">
        <div className="w-full max-w-md space-y-7">

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {view === 'login'  && 'Welcome Back'}
              {view === 'signup' && 'Create Account'}
              {view === 'forgot' && 'Reset Password'}
            </h1>
            <p className="text-slate-400 text-sm">
              {view === 'login'  && 'Sign in to access your dashboard'}
              {view === 'signup' && 'Join the eco-friendly carbon marketplace'}
              {view === 'forgot' && 'Enter your email and we\'ll send a secure reset link'}
            </p>
          </div>

          {/* Role Selector: Farmer / Business */}
          {view !== 'forgot' && (
            <div className="p-1 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 grid grid-cols-2 gap-1.5 shadow-inner">
              {[
                { id: 'farmer',   icon: '👨‍🌾', label: 'Farmer' },
                { id: 'business', icon: '🏢',   label: 'Business' },
              ].map(({ id, icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUserType(id)}
                  className={`flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                    userType === id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 scale-[1.01]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Google One-Click Button */}
          {view !== 'forgot' && (
            <div className="space-y-4">
              <button
                type="button"
                id="google-oauth-btn"
                onClick={handleGoogleOAuth}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-slate-800" />
                <span className="absolute bg-slate-900 px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Or with email
                </span>
              </div>
            </div>
          )}

          {/* ── FORGOT PASSWORD: Sent State ── */}
          {view === 'forgot' && resetSent ? (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-400/30 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-emerald-300 font-bold text-sm">Reset link sent!</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Check <span className="text-white font-semibold">{formData.email}</span> for a password reset link. Check your spam folder if you don't see it.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => switchView('login')}
                className="w-full py-3.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-sm transition-all"
              >
                ← Back to Login
              </button>
            </div>
          ) : (

          /* ── Main Form ── */
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Username (signup only) */}
            {view === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-bold text-slate-300 uppercase tracking-wider">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. greenfarmer_42"
                  required
                  autoComplete="username"
                  className={inputCls}
                />
              </div>
            )}

            {/* Identifier (login: username or email) */}
            {view === 'login' && (
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Username or Email
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder="Enter your username or email"
                  required
                  autoComplete="username"
                  className={inputCls}
                />
              </div>
            )}

            {/* Email (signup + forgot) */}
            {(view === 'signup' || view === 'forgot') && (
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </div>
            )}

            {/* Password (login + signup) */}
            {view !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-xs font-bold text-slate-300 uppercase tracking-wider">Password</label>
                  {view === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={view === 'signup' ? 'Min. 8 characters' : '••••••••'}
                    required
                    autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-semibold p-1"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {/* Strength indicator (signup only) */}
                {view === 'signup' && formData.password && (
                  <div className="space-y-1">
                    <div className="flex gap-1 h-1.5">
                      {[1,2,3,4,5].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300 ${i <= pwStrength ? STRENGTH_COLORS[pwStrength] : 'bg-slate-700'}`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-semibold ${STRENGTH_TEXT[pwStrength]}`}>
                      {STRENGTH_LABELS[pwStrength]}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password (signup only) */}
            {view === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                    className={`${inputCls} ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-red-600 focus:ring-red-500 focus:border-red-500'
                        : formData.confirmPassword && formData.password === formData.confirmPassword
                        ? 'border-emerald-600 focus:ring-emerald-500 focus:border-emerald-500'
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-semibold p-1"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-400 font-medium">Passwords do not match</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-xs text-emerald-400 font-medium">✓ Passwords match</p>
                )}
              </div>
            )}

            {/* Dev mode: skip email confirmation */}
            {view === 'signup' && process.env.NODE_ENV === 'development' && (
              <div className="flex items-center gap-3 p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-300 text-xs font-medium">
                <input
                  id="skipEmail"
                  type="checkbox"
                  checked={skipEmail}
                  onChange={(e) => setSkipEmail(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700 focus:ring-emerald-500"
                />
                <label htmlFor="skipEmail" className="cursor-pointer">Skip email confirmation (Dev mode)</label>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-medium space-y-2">
                <div>⚠️ {error}</div>
                {needsConfirmation && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="text-xs font-bold text-emerald-400 underline hover:text-emerald-300"
                  >
                    {resendLoading ? 'Resending...' : '→ Resend confirmation email'}
                  </button>
                )}
              </div>
            )}

            {/* Success Banner */}
            {success && !resetSent && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="auth-submit-btn"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {view === 'login'  && `Sign In as ${userType === 'farmer' ? 'Farmer 👨‍🌾' : 'Business 🏢'}`}
                  {view === 'signup' && `Join as ${userType === 'farmer' ? 'Farmer 👨‍🌾' : 'Business 🏢'}`}
                  {view === 'forgot' && 'Send Reset Link →'}
                </span>
              )}
            </button>
          </form>
          )}

          {/* View Switcher Footer */}
          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            {view === 'login' && (
              <p>
                Don't have an account?{' '}
                <button type="button" onClick={() => switchView('signup')} className="text-emerald-400 font-bold hover:underline ml-1">
                  Create one
                </button>
              </p>
            )}
            {view === 'signup' && (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={() => switchView('login')} className="text-emerald-400 font-bold hover:underline ml-1">
                  Sign In
                </button>
              </p>
            )}
            {view === 'forgot' && !resetSent && (
              <p>
                Remembered it?{' '}
                <button type="button" onClick={() => switchView('login')} className="text-emerald-400 font-bold hover:underline ml-1">
                  Back to Sign In
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
