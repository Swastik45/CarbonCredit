import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isRateLimited } from '@/lib/rateLimit';

/**
 * POST /api/auth/forgot-password
 * Sends a Supabase password reset email to the user.
 */
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Auth service not configured' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email } = body;
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
  }

  // Rate-limit: max 3 password resets per IP per 15 min
  const rateKey = `forgot:${ip}`;
  const rateCheck = await isRateLimited(rateKey, 3, 15 * 60 * 1000);
  if (rateCheck.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait 15 minutes before trying again.' },
      { status: 429 }
    );
  }

  const supabase = createClient(url, key);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://carbon-credit-opal.vercel.app').replace(/\/$/, '');
  const redirectTo = `${siteUrl}/auth/reset-password`;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      // Don't reveal if email exists — always say "check your inbox"
      console.error('Password reset error:', error.message);
    }

    // Always return success to prevent user enumeration
    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('Forgot password exception:', err);
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
  }
}
