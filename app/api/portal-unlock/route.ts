import { NextRequest, NextResponse } from 'next/server';
import { readStore } from '@/lib/db';
import { createPortalAccessToken, PORTAL_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { passcode?: string };
    const passcode = String(body.passcode ?? '').trim();
    const store = await readStore();

    if (!store.settings.portalPasscodeEnabled) {
      return NextResponse.json({ ok: true, unlocked: true });
    }

    if (passcode !== store.settings.portalPasscode) {
      return NextResponse.json(
        { error: 'Incorrect access passcode. Please verify with Med Invent Devices.' },
        { status: 401 }
      );
    }

    const token = createPortalAccessToken(store.settings.portalPasscode);
    const res = NextResponse.json({ ok: true, unlocked: true });
    res.cookies.set(PORTAL_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
