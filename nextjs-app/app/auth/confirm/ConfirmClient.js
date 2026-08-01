'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function getParam(params, key) {
  if (!params) return null;
  if (typeof params.get === 'function') return params.get(key);
  return params[key] || null;
}

export default function ConfirmClient({ searchParams }) {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const success = getParam(searchParams, 'success');
    const error = getParam(searchParams, 'error');

    if (success === 'true') {
      setStatus('success');
      setMessage('Email confirmed successfully! You can now log in.');
      const timeout = setTimeout(() => {
        router.push('/login?message=email_confirmed');
      }, 3000);
      return () => clearTimeout(timeout);
    }

    if (error === 'invalid_link') {
      setStatus('error');
      setMessage('Invalid confirmation link. Please check your email for the correct link.');
      return;
    }

    if (error === 'failed') {
      setStatus('error');
      setMessage('Email confirmation failed. The link may have expired or already been used. Please try logging in or registering again.');
      return;
    }

    const confirmEmail = async () => {
      const token_hash = getParam(searchParams, 'token_hash') || getParam(searchParams, 'token');
      const code = getParam(searchParams, 'code');
      const type = getParam(searchParams, 'type') || 'signup';

      if (!token_hash && !code) {
        setStatus('error');
        setMessage('Invalid confirmation link');
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        if (token_hash) queryParams.set('token_hash', token_hash);
        if (code) queryParams.set('code', code);
        if (type) queryParams.set('type', type);

        const response = await fetch('/api/auth/confirm?' + queryParams.toString());

        if (response.redirected) {
          const url = new URL(response.url);
          const successRes = url.searchParams.get('success');
          const errorRes = url.searchParams.get('error');

          if (successRes === 'true') {
            setStatus('success');
            setMessage('Email confirmed successfully! Redirecting to login...');
            setTimeout(() => {
              router.push('/login?message=email_confirmed');
            }, 2500);
          } else if (errorRes) {
            setStatus('error');
            setMessage(
              errorRes === 'invalid_link'
                ? 'Invalid confirmation link'
                : errorRes === 'failed'
                ? 'Confirmation failed. The link may have expired or already been used.'
                : 'An error occurred'
            );
          }
        } else {
          setStatus('error');
          setMessage('Confirmation failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error occurred');
      }
    };

    confirmEmail();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl p-8 text-center backdrop-blur-xl">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-white mb-2">Confirming your email...</h2>
              <p className="text-slate-400 text-sm">Please wait while we verify your account with Supabase.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Email Confirmed!</h2>
              <p className="text-slate-300 text-sm mb-8">{message}</p>
              <Link
                href="/login"
                className="inline-block w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all"
              >
                Continue to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/20 border border-red-400/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Confirmation Failed</h2>
              <p className="text-slate-300 text-sm mb-8">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all text-sm"
                >
                  Log In to Account
                </Link>
                <Link
                  href="/register"
                  className="block text-slate-400 hover:text-slate-200 text-xs font-semibold pt-2"
                >
                  Try Registering Again
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
