import { createClient } from '@supabase/supabase-js';

const supabaseServer = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { email } = await request.json();

  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const { error } = await supabaseServer.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      console.error('Resend confirmation error:', error);

      // Handle rate limit errors specifically
      if (error.message?.includes('rate limit') || error.message?.includes('too many requests') || error.message?.includes('email rate limit')) {
        return Response.json({
          error: 'Email rate limit exceeded. Please wait a few minutes before trying again.',
          rateLimited: true
        }, { status: 429 });
      }

      return Response.json({ error: error.message || 'Failed to resend confirmation email' }, { status: 500 });
    }

    return Response.json({
      message: 'Confirmation email sent successfully. Please check your email.'
    });
  } catch (error) {
    console.error('Resend confirmation error:', error);

    // Handle rate limit errors in catch block too
    if (error.message?.includes('rate limit') || error.message?.includes('too many requests') || error.message?.includes('email rate limit')) {
      return Response.json({
        error: 'Email rate limit exceeded. Please wait a few minutes before trying again.',
        rateLimited: true
      }, { status: 429 });
    }

    return Response.json({ error: 'Failed to resend confirmation email' }, { status: 500 });
  }
}