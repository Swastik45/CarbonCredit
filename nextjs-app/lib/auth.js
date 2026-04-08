import { createClient } from '@supabase/supabase-js';

const supabaseServer = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  // Special case: Admin token (hardcoded)
  if (token.startsWith('admin-token-')) {
    if (expectedType && expectedType !== 'admin') {
      return { error: 'Forbidden', status: 403 };
    }
    return {
      userId: 'admin-user',
      userType: 'admin',
      email: 'admin@system.local',
      username: 'admin',
    };
  }

  // Regular user: verify with Supabase
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
