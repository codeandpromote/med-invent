import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { mutateStore } from '@/lib/db';
import type { Product, ProductTier } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as Partial<Product> & {
    stockDelta?: number;
    stockReason?: string;
  };

  const updated = await mutateStore((draft) => {
    const product = draft.products.find((p) => p.id === id);
    if (!product) return null;

    if (typeof body.name === 'string' && body.name.trim()) {
      product.name = body.name.trim();
    }
    if (typeof body.shortName === 'string' && body.shortName.trim()) {
      product.shortName = body.shortName.trim();
    }
    if (typeof body.sku === 'string' && body.sku.trim()) {
      product.sku = body.sku.trim().toUpperCase();
    }
    if (typeof body.description === 'string') {
      product.description = body.description.trim();
    }
    if (typeof body.expiryNote === 'string') {
      product.expiryNote = body.expiryNote.trim();
    }
    if (typeof body.mrp === 'number' && Number.isFinite(body.mrp)) {
      product.mrp = Math.max(0, body.mrp);
    }
    if (typeof body.gstRatePct === 'number' && Number.isFinite(body.gstRatePct)) {
      product.gstRatePct = Math.max(0, body.gstRatePct);
    }
    if (typeof body.maxOnlineQty === 'number' && Number.isFinite(body.maxOnlineQty)) {
      product.maxOnlineQty = Math.max(1, Math.floor(body.maxOnlineQty));
    }
    if (typeof body.reorderLevel === 'number' && Number.isFinite(body.reorderLevel)) {
      product.reorderLevel = Math.max(0, Math.floor(body.reorderLevel));
    }
    if (typeof body.isActive === 'boolean') {
      product.isActive = body.isActive;
    }
    if (body.accentTheme) {
      product.accentTheme = body.accentTheme;
    }
    if (Array.isArray(body.tiers) && body.tiers.length > 0) {
      product.tiers = body.tiers
        .map(
          (t): ProductTier => ({
            minQty: Math.max(1, Math.floor(Number(t.minQty) || 1)),
            baseRate: Math.max(0, Number(t.baseRate) || 0),
            inclGstRate: Math.max(0, Number(t.inclGstRate) || 0),
            packLabel: t.packLabel ? String(t.packLabel) : undefined,
          })
        )
        .sort((a, b) => a.minQty - b.minQty);
    }

    // Direct stock adjustment delta
    if (typeof body.stockDelta === 'number' && body.stockDelta !== 0) {
      const previousStock = product.stockQty;
      const newStock = Math.max(0, previousStock + Math.trunc(body.stockDelta));
      product.stockQty = newStock;
      draft.inventoryLogs.unshift({
        id: `log-${crypto.randomUUID().slice(0, 8)}`,
        productId: product.id,
        productName: product.name,
        delta: newStock - previousStock,
        previousStock,
        newStock,
        reason: String(body.stockReason || 'Manual inventory adjustment').trim(),
        actor: 'Admin',
        createdAt: new Date().toISOString(),
      });
    } else if (
      typeof body.stockQty === 'number' &&
      Number.isFinite(body.stockQty) &&
      Math.floor(body.stockQty) !== product.stockQty
    ) {
      const previousStock = product.stockQty;
      const newStock = Math.max(0, Math.floor(body.stockQty));
      product.stockQty = newStock;
      draft.inventoryLogs.unshift({
        id: `log-${crypto.randomUUID().slice(0, 8)}`,
        productId: product.id,
        productName: product.name,
        delta: newStock - previousStock,
        previousStock,
        newStock,
        reason: String(body.stockReason || 'Stock count updated').trim(),
        actor: 'Admin',
        createdAt: new Date().toISOString(),
      });
    }

    return product;
  });

  if (!updated) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, product: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;

  const result = await mutateStore((draft) => {
    const inCombo = draft.combos.some(
      (c) => c.expanderProductId === id || c.forcepsProductId === id
    );
    if (inCombo) {
      return {
        error:
          'This product is linked to active Combo Packs. Deactivate it instead of deleting.',
      };
    }
    const idx = draft.products.findIndex((p) => p.id === id);
    if (idx === -1) return { notFound: true };
    draft.products.splice(idx, 1);
    return { ok: true };
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  if ('notFound' in result) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
