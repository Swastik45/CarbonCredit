import { NextResponse } from 'next/server';
import { sendAccountVerificationOtp } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    await sendAccountVerificationOtp(email);

    return NextResponse.json({
      message: 'A new verification code has been dispatched to your email.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to resend code.' }, { status: 400 });
  }
}
