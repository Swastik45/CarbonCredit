import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { attachSessionCookie } from '@/lib/authSession';

/**
 * GET /api/auth/google?userType=farmer|business
 * Initiates Google OAuth using server-side Supabase credentials.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType') || 'farmer';

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: 'Auth service not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

    const supabaseServer = createClient(url, key);
    const origin = new URL(request.url).origin;
    // Redirect directly to /auth/callback so user lands on dashboard after Google login
    const redirectTo = `${origin}/auth/callback?userType=${userType}`;

    const { data, error } = await supabaseServer.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error || !data?.url) {
      console.error('Failed to generate OAuth URL:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to initiate Google sign-in' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (err) {
    console.error('Google OAuth init error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/auth/google
 * Processes Google OAuth token or code after callback.
 */
export async function POST(request) {
  try {
    const { token, code, userType = 'farmer' } = await request.json();

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { error: 'Auth service not configured' },
        { status: 500 }
      );
    }
    const supabaseServer = createClient(url, key);

    let sessionData = null;

    if (code) {
      const { data, error } = await supabaseServer.auth.exchangeCodeForSession(code);
      if (!error && data?.session) {
        sessionData = data;
      }
    }

    if (!sessionData && token) {
      const { data, error } = await supabaseServer.auth.getUser(token);
      if (!error && data?.user) {
        sessionData = { session: { access_token: token }, user: data.user };
      }
    }

    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Failed to authenticate session' }, { status: 401 });
    }

    const user = sessionData.user;
    const existingType = user.user_metadata?.userType;

    if (!existingType) {
      await supabaseServer.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          userType,
          username: user.email?.split('@')[0] || 'user',
        },
      });
    }

    const finalType = existingType || userType;
    const username = user.user_metadata?.username || user.email?.split('@')[0];

    const response = NextResponse.json({
      message: 'Google login successful',
      userId: user.id,
      userType: finalType,
      username,
      accessToken: sessionData.session.access_token,
    });

    return attachSessionCookie(response, sessionData.session.access_token);
  } catch (err) {
    console.error('Google login processing error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
