import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { comparePassword, sendAccountVerificationOtp } from '@/lib/auth';
import { attachSessionCookie } from '@/lib/session';
import { hasAdminAccess } from '@/lib/adminBypass';
import { Role } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Ensure ADMIN role if email is in admin bypass list
    if (hasAdminAccess(normalizedEmail) && user.role !== Role.ADMIN) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: Role.ADMIN },
      });
    }

    if (!user.isActive) {
      await sendAccountVerificationOtp(normalizedEmail);
      return NextResponse.json(
        {
          error: 'Your account is not verified yet. A verification code has been sent to your email.',
          requiresOtp: true,
          email: normalizedEmail,
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      message: 'Signed in successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        carbonCredits: user.carbonCredits,
      },
    });

    return attachSessionCookie(response, user.id);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Authentication failed.' }, { status: 500 });
  }
}
