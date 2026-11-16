'use client';

import { AlertTriangle, CheckCircle2, ClipboardList, IndianRupee } from 'lucide-react';
import { formatINR } from '@/lib/pricing';
import type { InventoryLog, OrderRecord, Product } from '@/lib/types';

interface AdminDashboardTabProps {
  products: Product[];
  orders: OrderRecord[];
  inventoryLogs: InventoryLog[];
  metrics: {
    totalOrders: number;
    pendingCount: number;
    totalPipelineValue: number;
    confirmedOrDispatchedValue: number;
    lowStockCount: number;
    unitsByProduct: Record<string, number>;
    revenueByProduct: Record<string, number>;
    statusBreakdown: Record<string, number>;
  };
}

export function AdminDashboardTab({
  products,
  orders,
  inventoryLogs,
  metrics,
}: AdminDashboardTabProps) {
  const maxUnits = Math.max(
    1,
    ...products.map((p) => metrics.unitsByProduct[p.id] ?? 0)
  );
  const lowStockItems = products.filter(
    (p) => p.isActive && p.stockQty <= p.reorderLevel
  );

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Order Requests</span>
            <ClipboardList className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {metrics.totalOrders}
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {metrics.pendingCount} awaiting WhatsApp / confirmation
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Order Pipeline</span>
            <IndianRupee className="h-4 w-4 text-[#1D4ED8]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {formatINR(metrics.totalPipelineValue)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Excludes cancelled requests</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Confirmed &amp; Dispatched</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {formatINR(metrics.confirmedOrDispatchedValue)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Realized INR revenue</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-700">
            {metrics.lowStockCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {lowStockItems.length > 0
              ? lowStockItems.map((p) => p.shortName).join(', ')
              : 'All SKUs above reorder threshold'}
          </p>
        </div>
      </div>

      {/* Product Demand & Status Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <h2 className="font-display text-base font-bold text-slate-900">
            Units Requested &amp; Revenue by Product
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Includes standalone packs and devices bundled inside Promo Combos.
          </p>

          <div className="mt-5 space-y-4">
            {products.map((p) => {
              const units = metrics.unitsByProduct[p.id] ?? 0;
              const rev = metrics.revenueByProduct[p.id] ?? 0;
              const pct = Math.round((units / maxUnits) * 100);
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{p.name}</span>
                    <span className="font-mono tabular-nums text-slate-700">
                      {units} pcs · {formatINR(rev)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#1D4ED8] transition-all"
                      style={{ width: `${Math.max(pct, units > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <h2 className="font-display text-base font-bold text-slate-900">
            Order Pipeline by Status
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Current distribution across {orders.length} total customer requests.
          </p>

          <div className="mt-4 divide-y divide-slate-100">
            {[
              'Pending WhatsApp',
              'Payment Sent',
              'Confirmed',
              'Dispatched',
              'Quotation Requested',
              'Cancelled',
            ].map((status) => {
              const count = metrics.statusBreakdown[status] ?? 0;
              return (
                <div
                  key={status}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="text-slate-700">{status}</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inventory Stock Health & Recent Movement Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Stock Health Overview
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">SKU / Product</th>
                  <th className="py-2 px-3 text-right font-semibold">On Hand</th>
                  <th className="py-2 px-3 text-right font-semibold">Reorder At</th>
                  <th className="py-2 pl-3 text-right font-semibold">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isLow = p.stockQty <= p.reorderLevel;
                  return (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-slate-900">{p.shortName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{p.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {p.stockQty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {p.reorderLevel}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-semibold">
                        <span className={isLow ? 'text-amber-700' : 'text-emerald-700'}>
                          {isLow ? 'Low Stock' : 'Nominal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Recent Inventory Audit Trail
          </h2>
          <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100">
            {inventoryLogs.length === 0 ? (
              <p className="py-4 text-xs text-slate-500">No inventory movements logged yet.</p>
            ) : (
              inventoryLogs.slice(0, 12).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{log.productName}</div>
                    <div className="text-slate-500">
                      {log.reason} · {log.actor}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono tabular-nums">
                    <div
                      className={`font-semibold ${
                        log.delta >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {log.delta >= 0 ? `+${log.delta}` : log.delta}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {log.previousStock} → {log.newStock}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
