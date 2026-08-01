'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | invalid
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Supabase password reset sends the token in the URL hash: #access_token=...&type=recovery
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const type = params.get('type');

      if (token && type === 'recovery') {
        setAccessToken(token);
        return;
      }
    }

    // Also check search params (some Supabase versions use query params)
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (code) {
      // Exchange code for token via Supabase
      fetch('/api/auth/confirm?code=' + code + '&type=recovery')
        .then(() => {
          // After confirm, the hash will be set; re-check
          const h = window.location.hash;
          if (h) {
            const p = new URLSearchParams(h.substring(1));
            const t = p.get('access_token');
            if (t) setAccessToken(t);
          }
        })
        .catch(() => setStatus('invalid'));
      return;
    }

    setStatus('invalid');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password. Please request a new link.');
        setStatus('idle');
        return;
      }

      setStatus('success');
      setTimeout(() => router.push('/login?message=password_reset'), 3000);
    } catch {
      setError('Network error. Please try again.');
      setStatus('idle');
    }
  };

  // Strength checker
  const getStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = getStrength(newPassword);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength] || '';
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-teal-400'][strength] || 'bg-slate-700';

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans p-4">
        <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl p-8 text-center backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-500/20 border border-red-400/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Link Expired or Invalid</h1>
          <p className="text-slate-400 text-sm mb-8">
            This password reset link is invalid or has already been used. Please request a new one.
          </p>
          <Link
            href="/login"
            className="block w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all text-sm"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans p-4">
        <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl p-8 text-center backdrop-blur-xl">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Password Updated!</h1>
          <p className="text-slate-300 text-sm mb-2">Your password has been successfully changed.</p>
          <p className="text-slate-500 text-xs mb-8">Redirecting you to login...</p>
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-900 font-sans">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-12 flex-col justify-between overflow-hidden border-r border-emerald-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none -mr-20 -mt-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -ml-10 -mb-10" />
        <Link href="/" className="relative z-10 text-white text-2xl font-black tracking-wider flex items-center gap-3 group">
          <span className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">🌱</span>
          <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">CarbonCredit</span>
        </Link>
        <div className="relative z-10 space-y-4 max-w-lg">
          <h2 className="text-4xl font-extrabold text-white leading-tight">
            Secure account <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent italic font-serif">recovery.</span>
          </h2>
          <p className="text-slate-300/80 text-base leading-relaxed">
            Create a strong new password to protect your carbon credit marketplace account.
          </p>
          <div className="flex gap-3 pt-2">
            {['8+ characters', 'Uppercase', 'Numbers', 'Symbols'].map((tip) => (
              <span key={tip} className="px-2 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-slate-400">
                {tip}
              </span>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-slate-500">© {new Date().getFullYear()} CarbonCredit Inc.</p>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-900">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center sm:text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Password Reset
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Set New Password</h1>
            <p className="text-slate-400 text-sm">Choose a strong password for your account.</p>
          </div>

          {!accessToken ? (
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm">Verifying your reset link...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-700 bg-slate-800/90 text-white focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-semibold p-1"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {/* Strength Bar */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1 h-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-slate-700'}`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-semibold ${strength <= 1 ? 'text-red-400' : strength <= 2 ? 'text-orange-400' : strength <= 3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Repeat your password"
                  required
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-800/90 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-500 text-sm ${
                    confirmPassword && newPassword !== confirmPassword
                      ? 'border-red-600 focus:ring-red-500'
                      : 'border-slate-700'
                  }`}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400 font-medium">Passwords do not match</p>
                )}
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-medium">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !newPassword || newPassword !== confirmPassword}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  'Update Password'
                )}
              </button>

              <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
                <Link href="/login" className="text-emerald-400 font-bold hover:underline">
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
