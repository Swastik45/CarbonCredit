import bcrypt from 'bcryptjs';
import prisma from './dbconnect';
import { sendOtpEmail, isValidEmail } from './email';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function validatePasswordStrength(password: string): void {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter.');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number.');
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Generate and save account activation OTP */
export async function sendAccountVerificationOtp(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error('No account found for this email address.');
  }

  const otp = generate6DigitOtp();
  const otpCodeHash = await hashPassword(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCodeHash,
      otpExpiresAt,
      otpPreviousCodeHash: user.otpCodeHash ?? null,
    },
  });

  await sendOtpEmail(normalizedEmail, otp, { ttlMs: OTP_TTL_MS, isPasswordReset: false });
}

/** Verify activation OTP */
export async function verifyAccountOtp(email: string, otp: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.otpCodeHash || !user.otpExpiresAt) {
    throw new Error('Invalid or expired verification request.');
  }

  if (new Date(user.otpExpiresAt).getTime() < Date.now()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCodeHash: null, otpExpiresAt: null },
    });
    throw new Error('Verification code has expired. Please request a new code.');
  }

  const matches = await comparePassword(otp.trim(), user.otpCodeHash);
  if (!matches) {
    throw new Error('Invalid verification code. Please check and try again.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive: true,
      otpCodeHash: null,
      otpExpiresAt: null,
      otpPreviousCodeHash: null,
    },
  });

  return user.id;
}

/** Generate and save Password Reset OTP */
export async function sendForgotPasswordOtp(email: string): Promise<void> {
  if (!isValidEmail(email)) {
    throw new Error('Please enter a valid email address.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Avoid user enumeration
    return;
  }

  const otp = generate6DigitOtp();
  const resetOtpHash = await hashPassword(otp);
  const resetOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetOtpHash, resetOtpExpiresAt },
  });

  await sendOtpEmail(normalizedEmail, otp, { ttlMs: OTP_TTL_MS, isPasswordReset: true });
}

/** Reset password using OTP */
export async function resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  validatePasswordStrength(newPassword);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
    throw new Error('Invalid or expired password reset request.');
  }

  if (new Date(user.resetOtpExpiresAt).getTime() < Date.now()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtpHash: null, resetOtpExpiresAt: null },
    });
    throw new Error('Password reset code has expired. Please request a new one.');
  }

  const matches = await comparePassword(otp.trim(), user.resetOtpHash);
  if (!matches) {
    throw new Error('Invalid password reset code.');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetOtpHash: null,
      resetOtpExpiresAt: null,
    },
  });
}
