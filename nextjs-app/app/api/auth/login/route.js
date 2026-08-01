import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { isRateLimited } from '@/lib/rateLimit';
import { attachSessionCookie } from '@/lib/authSession';

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  const { username, password, userType } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  // Rate Limiting
  const rateLimitKey = `login:${username.toLowerCase().trim()}:${ip}`;
  const rateCheck = await isRateLimited(rateLimitKey, 5, 15 * 60 * 1000);
  if (rateCheck.limited) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in 15 minutes.' },
      { status: 429 }
    );
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Auth service not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 500 }
    );
  }
  const supabaseServer = createClient(url, key);

  try {
    // Try username lookup first; fall back to email lookup so users can log in with either
    let user = await db.users.findByUsername(username);
    if (!user && username.includes('@')) {
      user = await db.users.findByEmail(username);
    }

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const actualUserType = user.user_metadata?.userType;
    if (userType && actualUserType !== userType) {
      return NextResponse.json({ error: 'User type does not match this account' }, { status: 403 });
    }

    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (error) {
      if (error.message?.includes('Email not confirmed')) {
        return NextResponse.json({
          error: 'Email not confirmed',
          message: 'Please check your email and click the confirmation link before logging in.',
          needsConfirmation: true,
          email: user.email
        }, { status: 401 });
      }

      return NextResponse.json({ error: error.message || 'Invalid credentials' }, { status: 401 });
    }

    if (!data?.session) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({
      message: 'Login successful',
      userId: user.id,
      userType: actualUserType,
      username: user.user_metadata?.username,
      accessToken: data.session.access_token,
    });

    return attachSessionCookie(response, data.session.access_token);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

