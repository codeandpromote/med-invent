import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { mutateStore } from '@/lib/db';
import type { ComboPack } from '@/lib/types';

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<ComboPack>;
    const name = String(body.name ?? '').trim();
    const code = String(body.code ?? '').trim().toUpperCase();
    const expanderProductId = String(body.expanderProductId ?? '');
    const forcepsProductId = String(body.forcepsProductId ?? 'b-hex-forceps');

    if (!name || !code || !expanderProductId) {
      return NextResponse.json(
        { error: 'Combo name, code, and expander product are required.' },
        { status: 422 }
      );
    }

    const combo: ComboPack = {
      id: `combo-${crypto.randomUUID().slice(0, 6)}`,
      code,
      name,
      expanderProductId,
      expanderQty: Math.max(1, Math.floor(Number(body.expanderQty) || 2)),
      forcepsProductId,
      forcepsQty: Math.max(1, Math.floor(Number(body.forcepsQty) || 1)),
      comboPriceInclGst: Math.max(0, Number(body.comboPriceInclGst) || 0),
      mrpTotal: Math.max(0, Number(body.mrpTotal) || 0),
      accentTheme: body.accentTheme || 'blue',
      isActive: body.isActive ?? true,
    };

    await mutateStore((draft) => {
      draft.combos.push(combo);
    });

    return NextResponse.json({ ok: true, combo }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid combo payload.' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<ComboPack> & { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: 'Combo ID is required.' }, { status: 400 });
    }

    const updated = await mutateStore((draft) => {
      const combo = draft.combos.find((c) => c.id === body.id);
      if (!combo) return null;
      if (typeof body.name === 'string' && body.name.trim()) {
        combo.name = body.name.trim();
      }
      if (typeof body.comboPriceInclGst === 'number') {
        combo.comboPriceInclGst = Math.max(0, body.comboPriceInclGst);
      }
      if (typeof body.mrpTotal === 'number') {
        combo.mrpTotal = Math.max(0, body.mrpTotal);
      }
      if (typeof body.isActive === 'boolean') {
        combo.isActive = body.isActive;
      }
      return combo;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Combo not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, combo: updated });
  } catch {
    return NextResponse.json({ error: 'Invalid combo update.' }, { status: 400 });
  }
}
