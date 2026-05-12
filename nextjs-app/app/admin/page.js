'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem('admin_password');
    if (existing === 'admin123') {
      router.replace('/dashboard/admin');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (password !== 'admin123') {
        setError('Incorrect password.');
        return;
      }
      localStorage.setItem('admin_password', password);
      router.push('/dashboard/admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Admin Access</h1>
          <Link href="/" className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">
            Home
          </Link>
        </div>

        <p className="text-sm text-slate-500 mb-6">
          Enter the admin password to open the verification dashboard.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none focus:bg-white transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? 'Checking…' : 'Enter Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
