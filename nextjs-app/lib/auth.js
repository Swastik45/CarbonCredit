// Authentication utilities
export function validatePassword(password) {
  if (password.length < 6) return false;
  return true;
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getAuthFromHeaders(headers) {
  const userId = headers.get('x-user-id');
  const userType = headers.get('x-user-type');
  return { userId: userId ? parseInt(userId) : null, userType };
}

export function requireAuth(headers, expectedType = null) {
  const { userId, userType } = getAuthFromHeaders(headers);
  if (!userId || !userType) {
    return { error: 'Unauthorized', status: 401 };
  }
  if (expectedType && userType !== expectedType) {
    return { error: 'Forbidden', status: 403 };
  }
  return { userId, userType };
}
