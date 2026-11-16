import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { readStore } from '@/lib/db';
import { roundCurrency } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await readStore();

  const nonCancelledOrders = store.orders.filter((o) => o.status !== 'Cancelled');
  const totalPipelineValue = roundCurrency(
    nonCancelledOrders.reduce((acc, o) => acc + o.grandTotalInclGst, 0)
  );
  const confirmedOrDispatchedValue = roundCurrency(
    nonCancelledOrders
      .filter((o) => o.status === 'Confirmed' || o.status === 'Dispatched')
      .reduce((acc, o) => acc + o.grandTotalInclGst, 0)
  );
  const pendingCount = store.orders.filter(
    (o) => o.status === 'Pending WhatsApp' || o.status === 'Quotation Requested'
  ).length;
  const lowStockProducts = store.products.filter(
    (p) => p.isActive && p.stockQty <= p.reorderLevel
  );

  // Units ordered per product across active orders
  const unitsByProduct: Record<string, number> = {};
  const revenueByProduct: Record<string, number> = {};
  const comboMap = new Map(store.combos.map((c) => [c.id, c]));
  const productMap = new Map(store.products.map((p) => [p.id, p]));

  for (const order of nonCancelledOrders) {
    for (const item of order.items) {
      if (item.itemType === 'product') {
        unitsByProduct[item.refId] = (unitsByProduct[item.refId] ?? 0) + item.quantity;
        revenueByProduct[item.refId] = roundCurrency(
          (revenueByProduct[item.refId] ?? 0) + item.lineTotalInclGst
        );
      } else if (item.itemType === 'combo') {
        const combo = comboMap.get(item.refId);
        if (combo) {
          const expUnits = item.quantity * combo.expanderQty;
          const frcUnits = item.quantity * combo.forcepsQty;
          unitsByProduct[combo.expanderProductId] =
            (unitsByProduct[combo.expanderProductId] ?? 0) + expUnits;
          unitsByProduct[combo.forcepsProductId] =
            (unitsByProduct[combo.forcepsProductId] ?? 0) + frcUnits;

          const expRate =
            productMap.get(combo.expanderProductId)?.tiers[0]?.inclGstRate ?? 1890;
          const frcRate =
            productMap.get(combo.forcepsProductId)?.tiers[0]?.inclGstRate ?? 6600;
          const expStand = expUnits * expRate;
          const frcStand = frcUnits * frcRate;
          const denom = expStand + frcStand || 1;
          const expShare = roundCurrency((item.lineTotalInclGst * expStand) / denom);
          const frcShare = roundCurrency(item.lineTotalInclGst - expShare);

          revenueByProduct[combo.expanderProductId] = roundCurrency(
            (revenueByProduct[combo.expanderProductId] ?? 0) + expShare
          );
          revenueByProduct[combo.forcepsProductId] = roundCurrency(
            (revenueByProduct[combo.forcepsProductId] ?? 0) + frcShare
          );
        }
      }
    }
  }

  const statusBreakdown: Record<string, number> = {};
  for (const order of store.orders) {
    statusBreakdown[order.status] = (statusBreakdown[order.status] ?? 0) + 1;
  }

  return NextResponse.json({
    orders: store.orders,
    products: store.products,
    combos: store.combos,
    inventoryLogs: store.inventoryLogs.slice(0, 60),
    settings: store.settings,
    metrics: {
      totalOrders: store.orders.length,
      pendingCount,
      totalPipelineValue,
      confirmedOrDispatchedValue,
      lowStockCount: lowStockProducts.length,
      unitsByProduct,
      revenueByProduct,
      statusBreakdown,
    },
  });
}
