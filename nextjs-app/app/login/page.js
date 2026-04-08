'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [userType, setUserType] = useState('farmer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for URL parameters
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (message === 'email_confirmed') {
      setSuccess('Email confirmed successfully! You can now log in.');
    } else if (error === 'invalid_confirmation_link') {
      setError('Invalid confirmation link. Please try again.');
    } else if (error === 'confirmation_failed') {
      setError('Email confirmation failed. Please try registering again.');
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setNeedsConfirmation(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userType }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needsConfirmation) {
          setNeedsConfirmation(true);
          setConfirmationEmail(data.email);
          setError('Email not confirmed. Please check your email and click the confirmation link.');
          return;
        }
        setError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('userId', data.userId);
      localStorage.setItem('user_id', data.userId);
      localStorage.setItem('userType', data.userType);
      localStorage.setItem('user_type', data.userType);
      localStorage.setItem('username', data.username);
      localStorage.setItem('accessToken', data.accessToken);

      router.push(`/dashboard/${data.userType}`);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

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
      if (!res.ok) {
        setError(data.error || 'Failed to resend confirmation email');
        return;
      }

      setSuccess('Confirmation email sent! Please check your email.');
      setError('');
    } catch (err) {
      setError('Failed to resend confirmation email');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      
      {/* ── Left Side: Visual/Brand ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-emerald-900 p-12 flex-col justify-between overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px] -ml-10 -mb-10" />
        
        <Link href="/" className="relative z-10 text-white text-2xl font-bold flex items-center gap-2">
          <span>🌱</span> CarbonCredit
        </Link>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Welcome back to the <br /> 
            <span className="text-emerald-400 italic font-serif">green economy.</span>
          </h2>
          <p className="text-emerald-100/70 max-w-sm text-lg">
            Manage your verified plantations or offset your corporate footprint in one secure dashboard.
          </p>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-8 text-sm text-emerald-100/50">
          © {new Date().getFullYear()} CarbonCredit Marketplace. All rights reserved.
        </div>

        {/* Subtle Image Overlay */}
        <img 
          src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=1000" 
          alt="Forest backdrop" 
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
      </div>

      {/* ── Right Side: Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Login</h1>
            <p className="text-slate-500">Select your account type to continue</p>
          </div>

          {/* User Type Selector */}
          <div className="grid grid-cols-3 gap-3 mb-8 p-1.5 bg-slate-100 rounded-2xl">
            {['farmer', 'business', 'admin'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setUserType(type)}
                className={`
                  flex flex-col items-center justify-center py-3 px-2 rounded-xl text-xs font-bold transition-all duration-200
                  ${userType === type 
                    ? 'bg-white text-emerald-700 shadow-sm scale-[1.02]' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                `}
              >
                <span className="text-lg mb-1">
                  {type === 'farmer' ? '👨‍🌾' : type === 'business' ? '🏢' : '🔐'}
                </span>
                <span className="capitalize">{type}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Username</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                required
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <button type="button" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Forgot?</button>
              </div>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-shake">
                ⚠️ {error}
                {needsConfirmation && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="block mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
                  >
                    {resendLoading ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}

            {success && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium">
                ✅ {success}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-900 text-white font-bold py-4 rounded-xl hover:bg-emerald-800 shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Logging in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 text-sm">
            Don't have an account? {' '}
            <Link href="/register" className="text-emerald-700 font-bold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}