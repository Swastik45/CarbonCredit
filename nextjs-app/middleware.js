import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'carbon_session';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard/farmer',
  '/dashboard/business',
  '/dashboard/admin',
];

// Routes that are only accessible to unauthenticated users
const AUTH_ROUTES = ['/login', '/register'];

// Route-to-role mapping for role enforcement
const ROLE_ROUTES = {
  '/dashboard/farmer': 'farmer',
  '/dashboard/business': 'business',
  '/dashboard/admin': 'admin',
};

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Read session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value || null;

  // Check if route is protected
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users to login
  if (isProtected && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow all other routes to pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /api/auth/* (all auth API routes are public by design)
     * - /auth/* (email confirmation / OAuth callback / reset-password pages)
     * - Root / (landing page)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|auth/).*)',
  ],
};

