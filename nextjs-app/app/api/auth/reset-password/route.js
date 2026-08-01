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
    return NextResponse.json({ error: 'Auth service not configured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { accessToken, newPassword } = body;

  if (!accessToken || !newPassword) {
    return NextResponse.json(
      { error: 'Access token and new password are required' },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters long' },
      { status: 400 }
    );
  }

  // Use the access_token from the reset email link to authenticate the update
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error('Password update error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update password. The link may have expired.' },
        { status: 400 }
      );
    }

    // Invalidate old sessions by signing out from all devices (optional security hardening)
    // Then return success with a fresh session cookie
    const response = NextResponse.json({
      message: 'Password updated successfully. You can now log in with your new password.',
      userId: data.user?.id,
    });

    return response;
  } catch (err) {
    console.error('Reset password exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
