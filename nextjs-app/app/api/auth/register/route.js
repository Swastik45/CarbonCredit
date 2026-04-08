import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';

const supabaseServer = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { username, password, email, userType } = await request.json();

  if (!username || !password || !email) {
    return Response.json({ error: 'Username, email, and password are required' }, { status: 400 });
  }

  try {
    console.log('Creating user with:', { username, email, userType });

    // For admin users, create directly without email confirmation
    if (userType === 'admin') {
      const user = await db.users.create({
        username,
        password,
        email,
        userType: 'admin',
      });
      console.log('Admin user created:', user);

      return Response.json(
        {
          message: 'Admin registration successful! You can now login.',
          userId: user.id,
          userType: 'admin',
          username: user.user_metadata?.username || username,
          emailSent: false, // No email confirmation needed for admin
        },
        { status: 201 }
      );
    }

    // For regular users (farmer/business), use signup flow with email confirmation
    const { data, error } = await supabaseServer.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          userType: userType || 'farmer',
        },
      },
    });

    if (error) {
      console.error('Signup error:', error);
      throw error;
    }

    console.log('User signed up:', data);

    return Response.json(
      {
        message: 'Registration successful! Please check your email to confirm your account.',
        userId: data.user?.id,
        userType: userType || 'farmer',
        username: username,
        emailSent: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific Supabase errors
    if (error.message?.includes('already registered')) {
      return Response.json({ error: 'Email already registered' }, { status: 400 });
    }

    return Response.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
