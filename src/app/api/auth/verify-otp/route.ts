import { NextResponse } from 'next/server';
import { verifyAccountOtp } from '@/lib/auth';
import { attachSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const userId = await verifyAccountOtp(email, otp);

    const response = NextResponse.json({
      message: 'Account successfully verified!',
      success: true,
    });

    return attachSessionCookie(response, userId);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Verification failed.' }, { status: 400 });
  }
}
