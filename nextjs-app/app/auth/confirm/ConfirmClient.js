'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ConfirmClient({ searchParams }) {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

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
      setMessage('Email confirmation failed. The link may have expired. Please try registering again.');
      return;
    }

    const confirmEmail = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!token_hash || type !== 'email') {
        setStatus('error');
        setMessage('Invalid confirmation link');
        return;
      }

      try {
        const response = await fetch('/api/auth/confirm?' + new URLSearchParams({ token_hash, type }));

        if (response.redirected) {
          const url = new URL(response.url);
          const success = url.searchParams.get('success');
          const error = url.searchParams.get('error');

          if (success === 'true') {
            setStatus('success');
            setMessage('Email confirmed successfully! You can now log in.');
            setTimeout(() => {
              router.push('/login?message=email_confirmed');
            }, 3000);
          } else if (error) {
            setStatus('error');
            setMessage(
              error === 'invalid_link'
                ? 'Invalid confirmation link'
                : error === 'failed'
                ? 'Confirmation failed. Please try again.'
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Confirming your email...</h2>
              <p className="text-slate-600">Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Email Confirmed!</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <Link
                href="/login"
                className="inline-block bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Continue to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Confirmation Failed</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/register"
                  className="block bg-slate-100 text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Try Registering Again
                </Link>
                <Link href="/login" className="block text-emerald-600 font-bold hover:text-emerald-700">
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
