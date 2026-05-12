import { getSupabaseServer } from '@/lib/db';

export function getAuthFromHeaders(headers) {
  const authHeader = headers.get('authorization') || headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  return token || null;
}

export async function requireAuth(headers, expectedType = null) {
  const token = getAuthFromHeaders(headers);
  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Verify bearer token with Supabase for every role.
  let supabaseServer;
  try {
    supabaseServer = getSupabaseServer();
  } catch (e) {
    return { error: 'Auth service not configured', status: 500 };
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const userType = data.user.user_metadata?.userType || null;
  if (expectedType && userType !== expectedType) {
    return { error: 'Forbidden', status: 403 };
  }

  return {
    userId: data.user.id,
    userType,
    email: data.user.email,
    username: data.user.user_metadata?.username,
  };
}
