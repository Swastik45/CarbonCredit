import { createClient } from '@supabase/supabase-js';

const supabaseServer = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '');

  if (!token_hash || type !== 'email') {
    return Response.redirect(`${siteUrl}/auth/confirm?error=invalid_link`);
  }

  try {
    const { error } = await supabaseServer.auth.verifyOtp({
      token_hash,
      type: 'email',
    });

    if (error) {
      console.error('Email confirmation error:', error);
      return Response.redirect(`${siteUrl}/auth/confirm?error=failed`);
    }

    // Success - redirect to confirmation page
    return Response.redirect(`${siteUrl}/auth/confirm?success=true`);
  } catch (error) {
    console.error('Email confirmation error:', error);
    return Response.redirect(`${siteUrl}/auth/confirm?error=failed`);
  }
}