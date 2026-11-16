import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { mutateStore } from '@/lib/db';
import type { OrderStatus } from '@/lib/types';

const VALID_STATUSES: OrderStatus[] = [
  'Pending WhatsApp',
  'Payment Sent',
  'Confirmed',
  'Dispatched',
  'Quotation Requested',
  'Cancelled',
];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as {
    status?: OrderStatus;
    adminNotes?: string;
  };

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 });
  }

  const updated = await mutateStore((draft) => {
    const order = draft.orders.find((o) => o.id === id);
    if (!order) return null;

    const prevStatus = order.status;
    const nextStatus = body.status ?? prevStatus;
    const now = new Date().toISOString();

    // Restore stock when transitioning into Cancelled from a non-cancelled state
    if (prevStatus !== 'Cancelled' && nextStatus === 'Cancelled') {
      const comboMap = new Map(draft.combos.map((c) => [c.id, c]));
      const restoreMap = new Map<string, number>();

      for (const item of order.items) {
        if (item.itemType === 'product') {
          restoreMap.set(item.refId, (restoreMap.get(item.refId) ?? 0) + item.quantity);
        } else if (item.itemType === 'combo') {
          const combo = comboMap.get(item.refId);
          if (combo) {
            restoreMap.set(
              combo.expanderProductId,
              (restoreMap.get(combo.expanderProductId) ?? 0) +
                item.quantity * combo.expanderQty
            );
            restoreMap.set(
              combo.forcepsProductId,
              (restoreMap.get(combo.forcepsProductId) ?? 0) +
                item.quantity * combo.forcepsQty
            );
          }
        }
      }

      for (const [prodId, qty] of restoreMap.entries()) {
        const prod = draft.products.find((p) => p.id === prodId);
        if (!prod) continue;
        const previousStock = prod.stockQty;
        prod.stockQty = previousStock + qty;
        draft.inventoryLogs.unshift({
          id: `log-${crypto.randomUUID().slice(0, 8)}`,
          productId: prod.id,
          productName: prod.name,
          delta: qty,
          previousStock,
          newStock: prod.stockQty,
          reason: `Stock restored — Cancelled ${order.orderNumber}`,
          actor: 'Admin',
          createdAt: now,
        });
      }
    }

    order.status = nextStatus;
    if (typeof body.adminNotes === 'string') {
      order.adminNotes = body.adminNotes.trim();
    }
    order.updatedAt = now;
    return order;
  });

  if (!updated) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await context.params;
  const removed = await mutateStore((draft) => {
    const idx = draft.orders.findIndex((o) => o.id === id);
    if (idx === -1) return false;
    draft.orders.splice(idx, 1);
    return true;
  });

  if (!removed) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
