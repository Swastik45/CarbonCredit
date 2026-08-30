import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { attachSessionCookie } from '@/lib/authSession';

/**
 * POST /api/auth/reset-password
 * Called from the reset-password page with the new password + access_token from the reset link.
 */
export async function POST(request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: 'Auth service not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { accessToken, tokenHash, newPassword } = body;
  const recoveryToken = tokenHash || accessToken;

  if (!recoveryToken || !newPassword) {
    return NextResponse.json(
      { error: 'Recovery token and new password are required' },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters long' },
      { status: 400 }
    );
  }

  try {
    const supabase = createClient(url, key);

    let userId = null;
    let sessionData = null;

    if (tokenHash) {
      const verifyResult = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });

      if (verifyResult.error || !verifyResult.data?.session || !verifyResult.data?.user) {
        console.error('Recovery verification failed:', verifyResult.error);
        return NextResponse.json(
          { error: 'This reset link has expired or is invalid. Please request a new password reset email.' },
          { status: 400 }
        );
      }

      userId = verifyResult.data.user.id;
      sessionData = verifyResult.data.session;
      supabase.auth.setSession(sessionData);
    } else if (accessToken) {
      const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
      if (userError || !userData?.user) {
        console.error('Recovery token validation failed:', userError);
        return NextResponse.json(
          { error: 'This reset link has expired or is invalid. Please request a new password reset email.' },
          { status: 400 }
        );
      }

      userId = userData.user.id;
      sessionData = { access_token: accessToken };
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'This reset link has expired or is invalid. Please request a new password reset email.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error('Password update error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update password. The link may have expired.' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      message: 'Password updated successfully. You can now log in with your new password.',
      userId: data.user?.id || userId,
    });

    return response;
  } catch (err) {
    console.error('Reset password exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
