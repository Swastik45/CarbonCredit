'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackClient({ searchParams }) {
  const [status, setStatus] = useState('Signing you in with Google...');
  const router = useRouter();

  useEffect(() => {
    const processGoogleCallback = async () => {
      try {
        let code = searchParams?.code || searchParams?.get?.('code');
        let userType = searchParams?.userType || searchParams?.get?.('userType') || 'farmer';
        let accessToken = null;

        // Extract token or userType from URL hash fragment if present
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          accessToken = hashParams.get('access_token');
          const typeInHash = hashParams.get('userType');
          if (typeInHash) userType = typeInHash;
        }

        // Call backend POST endpoint to set HttpOnly session cookie and obtain user details
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: accessToken, code, userType }),
        });

        const data = await res.json();
        if (res.ok && data.userType) {
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('userType', data.userType);
          localStorage.setItem('username', data.username || '');
          router.push(`/dashboard/${data.userType}`);
          return;
        }

        // Fallback: If session was established by Supabase directly
        router.push(`/dashboard/${userType}`);
      } catch (err) {
        console.error('Google callback error:', err);
        router.push('/login?error=google_failed');
      }
    };

    processGoogleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans p-4">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl p-8 text-center backdrop-blur-xl max-w-sm w-full">
        <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-white mb-1">Logging in with Google</h2>
        <p className="text-slate-400 text-xs">{status}</p>
      </div>
    </div>
  );
}
