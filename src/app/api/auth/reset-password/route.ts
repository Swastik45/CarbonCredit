import { NextResponse } from 'next/server';
import { resetPasswordWithOtp } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, reset code, and new password are required.' }, { status: 400 });
    }

    await resetPasswordWithOtp(email, otp, newPassword);

    return NextResponse.json({
      message: 'Password successfully updated! You can now sign in with your new password.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Password reset failed.' }, { status: 400 });
  }
}
