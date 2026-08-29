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
  if (!request) return null;

  // Next.js request objects expose cookies directly.
  if (request.cookies && typeof request.cookies.get === 'function') {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (cookie?.value) return cookie.value;
  }

  const headers = request.headers || request;

  // Parse a raw Cookie header when the request is a plain Request/Headers object.
  const cookieHeader = headers.get?.('cookie') || headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return decodeURIComponent(trimmed.slice(SESSION_COOKIE_NAME.length + 1));
    }
  }

  // Fallback to Bearer auth token header.
  const authHeader = headers.get?.('authorization') || headers.get?.('Authorization') || headers.authorization || headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    return token || null;
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
