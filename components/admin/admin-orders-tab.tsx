'use client';

import { useState } from 'react';
import {
  Download,
  ExternalLink,
  Search,
  Trash2,
} from 'lucide-react';
import { buildWhatsAppUrl, formatINR } from '@/lib/pricing';
import type { OrderRecord, OrderStatus } from '@/lib/types';

interface AdminOrdersTabProps {
  orders: OrderRecord[];
  onRefresh: () => Promise<void>;
}

const ALL_STATUSES: OrderStatus[] = [
  'Pending WhatsApp',
  'Payment Sent',
  'Confirmed',
  'Dispatched',
  'Quotation Requested',
  'Cancelled',
];

const STATUS_STYLE: Record<OrderStatus, string> = {
  'Pending WhatsApp': 'text-amber-700',
  'Payment Sent': 'text-[#1D4ED8]',
  Confirmed: 'text-emerald-700',
  Dispatched: 'text-emerald-800',
  'Quotation Requested': 'text-purple-700',
  Cancelled: 'text-red-700',
};

export function AdminOrdersTab({ orders, onRefresh }: AdminOrdersTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    orders[0]?.id ?? null
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [statusDraft, setStatusDraft] = useState<Record<string, OrderStatus>>({});

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customer.orderingName.toLowerCase().includes(q) ||
      o.customer.orderingMobile.includes(q) ||
      o.customer.hospitalName.toLowerCase().includes(q) ||
      o.customer.pinCode.includes(q) ||
      o.customer.gstin.toLowerCase().includes(q)
    );
  });

  const selectedOrder =
    filtered.find((o) => o.id === selectedOrderId) ?? filtered[0] ?? null;

  async function handleUpdateOrder(order: OrderRecord) {
    setSavingId(order.id);
    try {
      const nextStatus = statusDraft[order.id] ?? order.status;
      const nextNotes = notesDraft[order.id] ?? order.adminNotes;
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, adminNotes: nextNotes }),
      });
      if (res.ok) {
        await onRefresh();
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteOrder(order: OrderRecord) {
    setSavingId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSelectedOrderId(null);
        await onRefresh();
      }
    } finally {
      setSavingId(null);
    }
  }

  function exportOrdersCsv() {
    const header = [
      'Order Number',
      'Date',
      'Status',
      'Ordering Name',
      'Ordering Mobile',
      'Receiving Name',
      'Receiving Mobile',
      'Hospital/Clinic',
      'Billing Address',
      'Delivery Address',
      'PIN Code',
      'GSTIN',
      'Total INR',
    ];
    const rows = filtered.map((o) => [
      o.orderNumber,
      o.createdAt,
      o.status,
      o.customer.orderingName,
      o.customer.orderingMobile,
      o.customer.receivingName,
      o.customer.receivingMobile,
      o.customer.hospitalName,
      o.customer.billingAddress,
      o.customer.deliveryAddress,
      o.customer.pinCode,
      o.customer.gstin,
      o.grandTotalInclGst.toString(),
    ]);
    const csv = [header, ...rows]
      .map((cols) =>
        cols.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medinvent-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, doctor, mobile, PIN, GSTIN..."
              aria-label="Search order submissions"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          <select
            aria-label="Filter orders by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | OrderStatus)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#1D4ED8] focus:outline-none"
          >
            <option value="ALL">All Statuses ({orders.length})</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={exportOrdersCsv}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Master-Detail Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-7">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No order submissions match your current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order #</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 text-right font-semibold">Total INR</th>
                    <th className="px-4 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((o) => {
                    const isSelected = selectedOrder?.id === o.id;
                    return (
                      <tr
                        key={o.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#EFF6FF]' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedOrderId(o.id)}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(o.id)}
                            className="text-left font-mono font-semibold text-slate-900 hover:underline"
                          >
                            {o.orderNumber}
                          </button>
                          <div className="text-[11px] text-slate-500">
                            {new Date(o.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {o.customer.orderingName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {o.customer.orderingMobile} · PIN {o.customer.pinCode}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                          {formatINR(o.grandTotalInclGst)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${STATUS_STYLE[o.status]}`}
                        >
                          {o.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Order Inspector */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          {!selectedOrder ? (
            <p className="text-sm text-slate-500">
              Select an order request to inspect customer details and update status.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-mono text-base font-bold text-slate-900">
                    {selectedOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submitted {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete order ${selectedOrder.orderNumber}`}
                  onClick={() => void handleDeleteOrder(selectedOrder)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">Ordering:</span>{' '}
                  {selectedOrder.customer.orderingName} ({selectedOrder.customer.orderingMobile})
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Receiving:</span>{' '}
                  {selectedOrder.customer.receivingName} ({selectedOrder.customer.receivingMobile})
                </div>
                {selectedOrder.customer.hospitalName ? (
                  <div>
                    <span className="font-semibold text-slate-900">Hospital/Clinic:</span>{' '}
                    {selectedOrder.customer.hospitalName}
                  </div>
                ) : null}
                <div>
                  <span className="font-semibold text-slate-900">Billing Address:</span>{' '}
                  {selectedOrder.customer.billingAddress}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Delivery Address:</span>{' '}
                  {selectedOrder.customer.deliveryAddress} (PIN {selectedOrder.customer.pinCode})
                </div>
                {selectedOrder.customer.gstin ? (
                  <div>
                    <span className="font-semibold text-slate-900">GSTIN:</span>{' '}
                    <span className="font-mono">{selectedOrder.customer.gstin}</span>
                  </div>
                ) : null}
                {selectedOrder.customer.email ? (
                  <div>
                    <span className="font-semibold text-slate-900">Email:</span>{' '}
                    {selectedOrder.customer.email}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-semibold text-slate-800">Itemized Lines</h4>
                <div className="mt-2 space-y-1.5 text-xs">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 text-slate-700"
                    >
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900">
                        {item.itemType === 'quotation'
                          ? 'Quote'
                          : formatINR(item.lineTotalInclGst)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
                    <span>Grand Total (Incl. GST)</span>
                    <span className="font-mono tabular-nums">
                      {formatINR(selectedOrder.grandTotalInclGst)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div>
                  <label
                    htmlFor={`status-${selectedOrder.id}`}
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Order Status
                  </label>
                  <select
                    id={`status-${selectedOrder.id}`}
                    value={statusDraft[selectedOrder.id] ?? selectedOrder.status}
                    onChange={(e) =>
                      setStatusDraft((prev) => ({
                        ...prev,
                        [selectedOrder.id]: e.target.value as OrderStatus,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`notes-${selectedOrder.id}`}
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Internal Admin Notes (AWB / Payment / Dispatch)
                  </label>
                  <textarea
                    id={`notes-${selectedOrder.id}`}
                    rows={2}
                    value={notesDraft[selectedOrder.id] ?? selectedOrder.adminNotes}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({
                        ...prev,
                        [selectedOrder.id]: e.target.value,
                      }))
                    }
                    placeholder="Add payment verification or courier tracking details..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={savingId === selectedOrder.id}
                    onClick={() => void handleUpdateOrder(selectedOrder)}
                    className="flex-1 rounded-lg bg-[#0F172A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingId === selectedOrder.id ? 'Saving...' : 'Save Order Update'}
                  </button>
                  <a
                    href={buildWhatsAppUrl(
                      selectedOrder.customer.orderingMobile,
                      `Hello ${selectedOrder.customer.orderingName}, regarding your Med Invent Devices order request ${selectedOrder.orderNumber} (Total ${formatINR(selectedOrder.grandTotalInclGst)}): `
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    <span>Message Customer</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
