'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [userType, setUserType] = useState('farmer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skipEmail, setSkipEmail] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const router = useRouter();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userType, skipEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Handle rate limit errors specifically
        if (data.rateLimited) {
          setError('Email rate limit exceeded. Please wait a few minutes before trying again. You can also try logging in if you already have an account.');
          return;
        }
        // Handle email errors
        if (data.emailError) {
          setError('Email sending failed. Please check your email address and try again, or contact support if the problem persists.');
          return;
        }
        setError(data.error || 'Registration failed');
        return;
      }

      // Show success message and redirect to login
      setError(''); // Clear any errors
      const successMessage = data.emailSent === false
        ? 'Registration successful! You can now log in.'
        : 'Registration successful! Please check your email to confirm your account before logging in.';
      alert(successMessage);
      router.push('/login');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      
      {/* ── Left Side: Inspiration & Context ── */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-emerald-900 p-12 flex-col justify-between overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-400/20 rounded-full blur-[100px]" />
        
        <Link href="/" className="relative z-10 text-white text-2xl font-bold flex items-center gap-2">
          <span>🌱</span> CarbonCredit
        </Link>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Join the movement <br />
            <span className="text-emerald-400 italic font-serif">for a better planet.</span>
          </h2>
          <ul className="space-y-4 text-emerald-100/80">
            <li className="flex items-center gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400">✓</span>
              Verify your assets with NDVI technology
            </li>
            <li className="flex items-center gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400">✓</span>
              Access a global marketplace of buyers
            </li>
            <li className="flex items-center gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400">✓</span>
              Transparent, fast, and secure payments
            </li>
          </ul>
        </div>

        <div className="relative z-10 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <p className="text-sm text-emerald-100/90 italic">
            "We've helped over 800 farmers monetize their sustainable efforts through satellite-verified credits."
          </p>
        </div>

        {/* Brand Image Overlay */}
        <img 
          src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=1000" 
          alt="Hands holding soil with a sprout" 
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
        />
      </div>

      {/* ── Right Side: Registration Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
            <p className="text-slate-500">Sign up and start trading carbon credits</p>
          </div>

          {/* User Type Switcher */}
          <div className="grid grid-cols-3 gap-2 mb-8 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/50">
            {['farmer', 'business', 'admin'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setUserType(type)}
                className={`
                  flex flex-col items-center py-3 rounded-xl transition-all duration-300
                  ${userType === type 
                    ? 'bg-white text-emerald-700 shadow-md ring-1 ring-black/5' 
                    : 'text-slate-500 hover:bg-white/50'}
                `}
              >
                <span className="text-xl mb-1">
                  {type === 'farmer' ? '👨‍🌾' : type === 'business' ? '🏢' : '🔐'}
                </span>
                <span className="text-[10px] uppercase font-black tracking-tighter capitalize">{type}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Username</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Unique username"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Email Address</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Password</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 text-sm"
              />
            </div>

            {/* Development mode checkbox - only show in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <input
                  id="skipEmail"
                  type="checkbox"
                  checked={skipEmail}
                  onChange={(e) => setSkipEmail(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-slate-50 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2"
                />
                <label htmlFor="skipEmail" className="text-sm text-amber-800 font-medium">
                  Skip email confirmation (Development only)
                </label>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-900 text-white font-bold py-4 rounded-xl hover:bg-emerald-800 shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-70 mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : `Join as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 text-sm">
            Already a member? {' '}
            <Link href="/login" className="text-emerald-700 font-bold hover:underline underline-offset-4">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}