import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'carbon_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

/**
 * Reads session token from request cookies or Authorization header.
 * @param {Request} request 
 * @returns {string|null}
 */
export function readSessionToken(request) {
  // Check cookies standard Next.js request
  if (request.cookies && typeof request.cookies.get === 'function') {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (cookie?.value) return cookie.value;
  }

  // Fallback to Cookie header parsing
  const cookieHeader = request.headers.get('cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return decodeURIComponent(trimmed.slice(SESSION_COOKIE_NAME.length + 1));
    }
  }

  // Fallback to Bearer token header
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
}

/**
 * Attaches httpOnly session cookie to a NextResponse.
 * @param {NextResponse} response 
 * @param {string} token 
 * @returns {NextResponse}
 */
export function attachSessionCookie(response, token) {
  if (!token) return response;
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  return response;
}

/**
 * Clears the session cookie on logout.
 * @param {NextResponse} response 
 * @returns {NextResponse}
 */
export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...getSessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
