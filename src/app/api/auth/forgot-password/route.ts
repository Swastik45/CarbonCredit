import { NextResponse } from 'next/server';
import { sendForgotPasswordOtp } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    await sendForgotPasswordOtp(email);

    return NextResponse.json({
      message: 'If an account exists for this email, a password reset code has been sent.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process request.' }, { status: 400 });
  }
}
