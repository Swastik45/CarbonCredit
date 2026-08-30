import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origin = new URL(request.url).origin;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, '');

  if (!url || !key) {
    return Response.redirect(`${siteUrl}/auth/confirm?error=missing_env`);
  }

  const supabaseServer = createClient(url, key);
  const { searchParams } = new URL(request.url);

  const token_hash = searchParams.get('token_hash') || searchParams.get('token');
  const code = searchParams.get('code');
  const type = searchParams.get('type') || 'signup';

  if (!token_hash && !code) {
    return Response.redirect(`${siteUrl}/auth/confirm?error=invalid_link`);
  }

  try {
    let verifyResult;

    if (code) {
      verifyResult = await supabaseServer.auth.exchangeCodeForSession(code);
    } else {
      // Try verifying with the requested type or fallback to 'signup' then 'email'
      const otpType = (type === 'email' || type === 'signup' || type === 'recovery' || type === 'invite') ? type : 'signup';
      
      verifyResult = await supabaseServer.auth.verifyOtp({
        token_hash,
        type: otpType,
      });

      // If initial attempt fails and type was 'signup', retry with 'email'
      if (verifyResult.error && otpType === 'signup') {
        verifyResult = await supabaseServer.auth.verifyOtp({
          token_hash,
          type: 'email',
        });
      }
    }

    if (verifyResult.error) {
      console.error('Email confirmation error:', verifyResult.error);
      return Response.redirect(`${siteUrl}/auth/confirm?error=failed`);
    }

    // Success - redirect to confirmation page with success indicator
    return Response.redirect(`${siteUrl}/auth/confirm?success=true`);
  } catch (error) {
    console.error('Email confirmation exception:', error);
    return Response.redirect(`${siteUrl}/auth/confirm?error=failed`);
  }
}