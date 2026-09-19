/**
 * Admin role access granting list.
 * Mimics Padhum's devAdminBypass design pattern.
 * Automatically grants ADMIN privileges upon login & registration.
 */
export const ADMIN_ALLOWED_EMAILS = [
  'psamarpaudel@gmail.com',
  'admin@carboncredit.com',
  'admin@gmail.com',
  'aryalsashwat@gmail.com',
];

export function hasAdminAccess(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  
  if (ADMIN_ALLOWED_EMAILS.includes(normalized)) return true;
  if (normalized.startsWith('admin') || normalized.includes('admin@') || normalized.endsWith('@carboncredit.com')) {
    return true;
  }
  return false;
}
