import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readStore } from '@/lib/db';
import { PORTAL_COOKIE_NAME, verifyPortalAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await readStore();
  const cookieStore = await cookies();
  const portalToken = cookieStore.get(PORTAL_COOKIE_NAME)?.value;

  const portalUnlocked =
    !store.settings.portalPasscodeEnabled ||
    verifyPortalAccessToken(portalToken, store.settings.portalPasscode);

  const { portalPasscode: _hiddenPasscode, ...publicSettings } = store.settings;

  return NextResponse.json({
    products: store.products.filter((p) => p.isActive),
    combos: store.combos.filter((c) => c.isActive),
    settings: publicSettings,
    portalUnlocked,
  });
}
