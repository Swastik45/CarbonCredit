import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '');

  if (!url || !key) {
    return Response.redirect(`${siteUrl}/auth/confirm?error=missing_env`);
  }

  const supabaseServer = createClient(url, key);
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

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