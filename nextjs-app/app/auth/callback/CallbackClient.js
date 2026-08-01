'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackClient({ searchParams }) {
  const [status, setStatus] = useState('Signing you in with Google...');
  const router = useRouter();

  useEffect(() => {
    const processGoogleCallback = async () => {
      try {
        // Next.js 14 App Router: searchParams is a plain object, NOT URLSearchParams
        // Never call .get() on it — use direct property access
        const rawParams = searchParams || {};
        let code = rawParams.code || null;

        let savedType =
          typeof window !== 'undefined'
            ? localStorage.getItem('pendingUserType')
            : null;

        // Prefer URL param, then localStorage, then default
        let userType = rawParams.userType || savedType || 'farmer';
        let accessToken = null;

        // Also parse URL search string directly in the browser for reliability
        if (typeof window !== 'undefined') {
          const browserParams = new URLSearchParams(window.location.search);
          if (!code) code = browserParams.get('code');
          if (!rawParams.userType) {
            const browserType = browserParams.get('userType');
            if (browserType) userType = browserType;
          }
        }

        // Extract token or userType from URL hash fragment if present (implicit flow)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          accessToken = hashParams.get('access_token');
          const typeInHash = hashParams.get('userType');
          if (typeInHash) userType = typeInHash;
        }

        setStatus('Authenticating with server...');

        // Call backend POST endpoint to set HttpOnly session cookie and obtain user details
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: accessToken, code, userType }),
        });

        const data = await res.json();
        const finalUserType = data?.userType || userType;

        // Store access token + metadata for dashboard auth checks and API calls
        if (data?.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
        if (data?.userId) {
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('user_id', data.userId);
        }
        localStorage.setItem('userType', finalUserType);
        localStorage.setItem('user_type', finalUserType);
        if (data?.username) {
          localStorage.setItem('username', data.username);
        }

        // Clean up pending type
        localStorage.removeItem('pendingUserType');

        setStatus(`Redirecting to your ${finalUserType} dashboard...`);

        // Redirect to the role-specific dashboard
        const dashboardPath =
          finalUserType === 'business'
            ? '/dashboard/business'
            : finalUserType === 'admin'
            ? '/dashboard/admin'
            : '/dashboard/farmer';

        router.push(dashboardPath);
      } catch (err) {
        console.error('Google callback error:', err);
        const fallbackType =
          (typeof window !== 'undefined' &&
            localStorage.getItem('pendingUserType')) ||
          'farmer';
        router.push(`/dashboard/${fallbackType}`);
      }
    };

    processGoogleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
