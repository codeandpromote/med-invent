import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'mid_admin_session';
export const PORTAL_COOKIE_NAME = 'mid_portal_access';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@medinventdevices.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MedInvent@2026';
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'medinvent-devices-shared-secret-2026-india';

function signPayload(payload: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    password === ADMIN_PASSWORD
  );
}

export function createAdminSessionToken(): string {
  const issuedAt = Date.now().toString();
  const payload = `admin:${issuedAt}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload.startsWith('admin:')) return false;
  const expected = signPayload(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export function createPortalAccessToken(passcode: string): string {
  const hash = signPayload(`portal:${passcode}`);
  return hash;
}

export function verifyPortalAccessToken(
  token: string | undefined,
  expectedPasscode: string
): boolean {
  if (!token) return false;
  const expected = signPayload(`portal:${expectedPasscode}`);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
