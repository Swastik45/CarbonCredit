import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import prisma from '@/lib/dbconnect';

export const SESSION_COOKIE_NAME = 'carbon_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string;
};

function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length < 16) {
    return null;
  }
  return secret;
}

/** Sign a JWT containing { userId }. */
export function createSessionToken(userId: string): string {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('JWT_SECRET is not configured properly in environment variables.');
  }
  return jwt.sign({ userId } satisfies SessionPayload, secret, {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

/** Verify JWT token and return session payload or null. */
export function verifySessionToken(token: string): SessionPayload | null {
  const secret = getJwtSecret();
  if (!secret || !token) return null;
  try {
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload & SessionPayload;
    if (!decoded?.userId || typeof decoded.userId !== 'string') return null;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function readSessionCookie(request: Request): string | null {
  const maybeCookies = (request as Request & {
    cookies?: { get?: (name: string) => { value: string } | undefined };
  }).cookies;

  if (maybeCookies?.get) {
    const fromNext = maybeCookies.get(SESSION_COOKIE_NAME)?.value;
    if (fromNext) return fromNext;
  }

  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return decodeURIComponent(trimmed.slice(SESSION_COOKIE_NAME.length + 1));
    }
  }
  return null;
}

/** Attach signed httpOnly session cookie to NextResponse. */
export function attachSessionCookie(response: NextResponse, userId: string): NextResponse {
  const token = createSessionToken(userId);
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  return response;
}

/** Clear the session cookie. */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...getSessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}

/** Resolve authenticated User from incoming request. */
export async function getUserFromRequest(request: Request): Promise<User | null> {
  const token = readSessionCookie(request);
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.isActive === false) return null;
    return user;
  } catch {
    return null;
  }
}
