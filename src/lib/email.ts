import nodemailer from 'nodemailer';

const RESERVED_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.net',
  'example.org',
  'test.com',
  'test.net',
  'test.org',
  'invalid',
  'localhost',
  'local',
]);

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) return false;

  const parts = normalized.split('@');
  const domain = parts.length === 2 ? parts[1].toLowerCase() : '';
  if (!domain || RESERVED_EMAIL_DOMAINS.has(domain)) return false;

  return true;
}

const DEFAULT_OTP_TTL_MS = 5 * 60 * 1000;

function formatOtpTtlLabel(ttlMs: number = DEFAULT_OTP_TTL_MS): string {
  const totalSeconds = Math.max(1, Math.round(ttlMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0 && seconds === 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }
  if (minutes > 0) {
    return `${minutes} min ${seconds} sec`;
  }
  return `${seconds} seconds`;
}

/**
 * Sends OTP Verification Email using Nodemailer.
 * Automatically logs to dev console if SMTP variables are unconfigured.
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  options: { ttlMs?: number; isPasswordReset?: boolean } = {}
): Promise<{ sent: boolean; devMode?: boolean }> {
  const ttlMs = options.ttlMs ?? DEFAULT_OTP_TTL_MS;
  const ttlLabel = formatOtpTtlLabel(ttlMs);
  const isReset = options.isPasswordReset ?? false;

  if (!isValidEmail(email)) {
    throw new Error('Please provide a valid email address.');
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || '587';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"Carbon Credit Support" <noreply@carboncredit.com>';

  const logDevOtp = () => {
    console.log('\n' + '='.repeat(54));
    console.log('       🍃 CARBON CREDIT DEVELOPMENT OTP EMAIL 🍃');
    console.log('='.repeat(54));
    console.log(`To:          ${email}`);
    console.log(`Purpose:     ${isReset ? 'Password Reset Verification' : 'Account Activation Verification'}`);
    console.log(`OTP Code:    >>> ${otp} <<<`);
    console.log(`Expires In:  ${ttlLabel}`);
    console.log('='.repeat(54) + '\n');
  };

  if (!host || !user || !pass) {
    console.log('Info: SMTP environment variables not configured. Logging OTP to console for development:');
    logDevOtp();
    return { sent: false, devMode: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: { user, pass },
    });

    const subject = isReset
      ? `${otp} is your Carbon Credit Password Reset Code`
      : `${otp} is your Carbon Credit Verification Code`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0a0f0d; color: #f0fdf4; border-radius: 16px; border: 1px solid #166534;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #22c55e; margin: 0; font-size: 28px; letter-spacing: 0.5px;">🍃 Carbon Credit</h2>
          <p style="color: #86efac; font-size: 14px; margin-top: 4px;">Empowering Sustainable Futures</p>
        </div>
        <div style="background-color: #121a16; padding: 24px; border-radius: 12px; border: 1px solid #1a2620; text-align: center;">
          <p style="font-size: 16px; color: #dcfce7; margin-top: 0;">${isReset ? 'Your password reset code is:' : 'Your account verification code is:'}</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4ade80; margin: 20px 0; background: #052e16; padding: 16px; border-radius: 8px; border: 1px dashed #22c55e; display: inline-block;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #86efac; margin-bottom: 0;">This verification code expires in <strong>${ttlLabel}</strong>.</p>
        </div>
        <p style="font-size: 12px; color: #86efac; text-align: center; margin-top: 24px; opacity: 0.8;">
          If you did not request this email, please ignore it or contact our support team.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: email,
      subject,
      html: htmlContent,
    });

    return { sent: true };
  } catch (error: any) {
    console.error('Failed to send email via SMTP, logging OTP code to console fallback:', error?.message);
    logDevOtp();
    return { sent: false, devMode: true };
  }
}
