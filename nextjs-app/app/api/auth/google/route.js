import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { attachSessionCookie } from '@/lib/authSession';

export async function POST(request) {
  try {
    const { token, userType = 'farmer' } = await request.json();

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { error: 'Auth service not configured' },
        { status: 500 }
      );
    }
    const supabaseServer = createClient(url, key);

    if (!token) {
      return NextResponse.json({ error: 'Google ID token required' }, { status: 400 });
    }

    // Verify Google ID token with Supabase Auth
    const { data, error } = await supabaseServer.auth.signInWithIdToken({
      provider: 'google',
      token,
    });

    if (error || !data?.session) {
      console.error('Google auth error:', error);
      return NextResponse.json({ error: error?.message || 'Google authentication failed' }, { status: 401 });
    }

    const user = data.user;
    const existingType = user.user_metadata?.userType;

    // Update user metadata if userType wasn't set yet
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
      accessToken: data.session.access_token,
    });

    return attachSessionCookie(response, data.session.access_token);
  } catch (err) {
    console.error('Google login route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
