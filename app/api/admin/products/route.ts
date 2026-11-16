import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { mutateStore } from '@/lib/db';
import type { Product, ProductCategory, ProductTier } from '@/lib/types';

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<Product>;
    const name = String(body.name ?? '').trim();
    const sku = String(body.sku ?? '').trim().toUpperCase();
    const shortName = String(body.shortName ?? name).trim();

    if (!name || !sku) {
      return NextResponse.json(
        { error: 'Product name and SKU are required.' },
        { status: 422 }
      );
    }

    const tiers: ProductTier[] = Array.isArray(body.tiers) && body.tiers.length > 0
      ? body.tiers
          .map((t) => ({
            minQty: Math.max(1, Math.floor(Number(t.minQty) || 1)),
            baseRate: Math.max(0, Number(t.baseRate) || 0),
            inclGstRate: Math.max(0, Number(t.inclGstRate) || 0),
            packLabel: t.packLabel ? String(t.packLabel) : undefined,
          }))
          .sort((a, b) => a.minQty - b.minQty)
      : [{ minQty: 1, baseRate: 1800, inclGstRate: 1890, packLabel: '1 Pc' }];

    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + crypto.randomUUID().slice(0, 4);

    const newProduct: Product = {
      id,
      sku,
      name,
      shortName,
      category: (body.category as ProductCategory) || 'expander',
      mrp: Math.max(0, Number(body.mrp) || 0),
      expiryNote: String(body.expiryNote ?? 'Exp 3 Yrs').trim(),
      gstRatePct: Math.max(0, Number(body.gstRatePct) ?? 5),
      description: String(body.description ?? '').trim(),
      accentTheme: body.accentTheme || 'blue',
      imageKey: body.category === 'forceps' ? 'forceps' : 'expander',
      maxOnlineQty: Math.max(1, Math.floor(Number(body.maxOnlineQty) || 20)),
      stockQty: Math.max(0, Math.floor(Number(body.stockQty) || 0)),
      reorderLevel: Math.max(0, Math.floor(Number(body.reorderLevel) || 20)),
      isActive: body.isActive ?? true,
      tiers,
    };

    const result = await mutateStore((draft) => {
      if (draft.products.some((p) => p.sku.toUpperCase() === sku)) {
        return { error: `A product with SKU ${sku} already exists.` };
      }
      draft.products.push(newProduct);
      if (newProduct.stockQty > 0) {
        draft.inventoryLogs.unshift({
          id: `log-${crypto.randomUUID().slice(0, 8)}`,
          productId: newProduct.id,
          productName: newProduct.name,
          delta: newProduct.stockQty,
          previousStock: 0,
          newStock: newProduct.stockQty,
          reason: 'Initial product stock added',
          actor: 'Admin',
          createdAt: new Date().toISOString(),
        });
      }
      return { product: newProduct };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true, product: result.product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid product payload.' }, { status: 400 });
  }
}
