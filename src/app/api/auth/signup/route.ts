import { NextResponse } from 'next/server';
import prisma from '@/lib/dbconnect';
import { hashPassword, validatePasswordStrength, sendAccountVerificationOtp } from '@/lib/auth';
import { isValidEmail } from '@/lib/email';
import { hasAdminAccess } from '@/lib/adminBypass';
import { Role } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, role } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Please provide a valid name (at least 2 characters).' }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    validatePasswordStrength(password);

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (!existingUser.isActive) {
        await sendAccountVerificationOtp(normalizedEmail);
        return NextResponse.json({
          message: 'An account with this email exists but is unverified. A new verification code has been dispatched.',
          requiresOtp: true,
          email: normalizedEmail,
        });
      }
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    
    // Auto-grant ADMIN role if email matches admin list (e.g., psamarpaudel@gmail.com)
    let assignedRole: Role = Role.FARMER;
    if (hasAdminAccess(normalizedEmail)) {
      assignedRole = Role.ADMIN;
    } else if (role === 'BUSINESS' || role === 'COMPANY') {
      assignedRole = Role.BUSINESS;
    } else if (role === 'ADMIN') {
      assignedRole = Role.ADMIN;
    }

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        companyName: companyName ? String(companyName).trim() : null,
        role: assignedRole,
        isActive: false,
      },
    });

    await sendAccountVerificationOtp(normalizedEmail);

    return NextResponse.json({
      message: `Registration successful! Verification code sent to your email. ${assignedRole === Role.ADMIN ? '(Admin Privileges Granted)' : ''}`,
      requiresOtp: true,
      email: normalizedEmail,
      role: assignedRole,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to complete registration.' }, { status: 500 });
  }
}
