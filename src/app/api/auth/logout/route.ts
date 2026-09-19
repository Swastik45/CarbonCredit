import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ message: 'Signed out successfully.' });
  return clearSessionCookie(response);
}
