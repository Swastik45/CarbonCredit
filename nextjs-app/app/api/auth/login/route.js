import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';

const supabaseServer = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { username, password, userType } = await request.json();

  if (!username || !password) {
    return Response.json({ error: 'Username and password required' }, { status: 400 });
  }

  // All user types use Supabase auth.
  try {
    console.log('Finding user by username:', username);
    const user = await db.users.findByUsername(username);
    console.log('User found:', user ? 'yes' : 'no');

    if (!user || !user.email) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const actualUserType = user.user_metadata?.userType;
    if (userType && actualUserType !== userType) {
      return Response.json({ error: 'User type does not match this account' }, { status: 403 });
    }

    console.log('Signing in with email:', user.email);
    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);

      // Handle email not confirmed
      if (error.message?.includes('Email not confirmed')) {
        return Response.json({
          error: 'Email not confirmed',
          message: 'Please check your email and click the confirmation link before logging in.',
          needsConfirmation: true,
          email: user.email
        }, { status: 401 });
      }

      return Response.json({ error: error.message || 'Invalid credentials' }, { status: 401 });
    }

    if (!data?.session) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    console.log('Login successful');
    return Response.json({
      message: 'Login successful',
      userId: user.id,
      userType: actualUserType,
      username: user.user_metadata?.username,
      accessToken: data.session.access_token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}
