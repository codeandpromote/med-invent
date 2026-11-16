import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { mutateStore } from '@/lib/db';
import type { SiteSettings } from '@/lib/types';

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<SiteSettings>;
    const updated = await mutateStore((draft) => {
      const s = draft.settings;
      if (typeof body.companyName === 'string' && body.companyName.trim()) {
        s.companyName = body.companyName.trim();
      }
      if (typeof body.websiteUrl === 'string' && body.websiteUrl.trim()) {
        s.websiteUrl = body.websiteUrl.trim();
      }
      if (typeof body.whatsappNumber === 'string' && body.whatsappNumber.trim()) {
        s.whatsappNumber = body.whatsappNumber.replace(/\D/g, '');
      }
      if (typeof body.displayPhone === 'string' && body.displayPhone.trim()) {
        s.displayPhone = body.displayPhone.trim();
      }
      if (typeof body.supportEmail === 'string' && body.supportEmail.trim()) {
        s.supportEmail = body.supportEmail.trim();
      }
      if (typeof body.promoBannerText === 'string') {
        s.promoBannerText = body.promoBannerText.trim();
      }
      if (typeof body.deliveryCoverageNote === 'string') {
        s.deliveryCoverageNote = body.deliveryCoverageNote.trim();
      }
      if (typeof body.distributorDisclaimer === 'string') {
        s.distributorDisclaimer = body.distributorDisclaimer.trim();
      }
      if (typeof body.patentFooterNote === 'string') {
        s.patentFooterNote = body.patentFooterNote.trim();
      }
      if (Array.isArray(body.terms)) {
        s.terms = body.terms.map((t) => String(t).trim()).filter(Boolean);
      }
      if (typeof body.portalPasscodeEnabled === 'boolean') {
        s.portalPasscodeEnabled = body.portalPasscodeEnabled;
      }
      if (typeof body.portalPasscode === 'string' && body.portalPasscode.trim()) {
        s.portalPasscode = body.portalPasscode.trim();
      }
      return s;
    });

    return NextResponse.json({ ok: true, settings: updated });
  } catch {
    return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
  }
}
