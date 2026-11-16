'use client';

import { useState } from 'react';
import { PackagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import { formatINR } from '@/lib/pricing';
import type { ComboPack, Product, ProductCategory, ProductTier } from '@/lib/types';

interface AdminInventoryTabProps {
  products: Product[];
  combos: ComboPack[];
  onRefresh: () => Promise<void>;
}

export function AdminInventoryTab({
  products,
  combos,
  onRefresh,
}: AdminInventoryTabProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stockAdjustMap, setStockAdjustMap] = useState<
    Record<string, { delta: string; reason: string }>
  >({});
  const [comboDrafts, setComboDrafts] = useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // New Product Form State
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('expander');
  const [newMrp, setNewMrp] = useState('3555');
  const [newGst, setNewGst] = useState('5');
  const [newExpiry, setNewExpiry] = useState('Exp 3 Yrs');
  const [newStock, setNewStock] = useState('50');
  const [newReorder, setNewReorder] = useState('15');
  const [newDesc, setNewDesc] = useState('');
  const [newRate1, setNewRate1] = useState('2100');
  const [newRate5, setNewRate5] = useState('1785');
  const [newRate10, setNewRate10] = useState('1732.5');
  const [newRate20, setNewRate20] = useState('1680');

  async function handleStockAdjust(productId: string, deltaValue: number, reason: string) {
    setErrorMessage('');
    setStatusMessage('');
    if (!deltaValue) return;
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockDelta: deltaValue,
        stockReason: reason || 'Manual stock adjustment',
      }),
    });
    if (res.ok) {
      setStockAdjustMap((prev) => ({
        ...prev,
        [productId]: { delta: '', reason: '' },
      }));
      setStatusMessage('Inventory updated and logged.');
      await onRefresh();
    } else {
      const data = await res.json();
      setErrorMessage(data.error || 'Failed to update inventory.');
    }
  }

  async function handleSaveProductEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    setErrorMessage('');
    setStatusMessage('');
    const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingProduct.name,
        shortName: editingProduct.shortName,
        sku: editingProduct.sku,
        mrp: Number(editingProduct.mrp),
        gstRatePct: Number(editingProduct.gstRatePct),
        expiryNote: editingProduct.expiryNote,
        maxOnlineQty: Number(editingProduct.maxOnlineQty),
        reorderLevel: Number(editingProduct.reorderLevel),
        description: editingProduct.description,
        isActive: editingProduct.isActive,
        tiers: editingProduct.tiers,
      }),
    });
    if (res.ok) {
      setEditingProduct(null);
      setStatusMessage('Product & pricing tiers saved.');
      await onRefresh();
    } else {
      const data = await res.json();
      setErrorMessage(data.error || 'Failed to save product.');
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    const gstPct = Number(newGst) || 5;
    const toBase = (incl: number) =>
      Math.round((incl / (1 + gstPct / 100)) * 100) / 100;

    const tiers: ProductTier[] =
      newCategory === 'expander'
        ? [
            { minQty: 1, inclGstRate: Number(newRate1), baseRate: toBase(Number(newRate1)), packLabel: '1 Pc' },
            { minQty: 5, inclGstRate: Number(newRate5), baseRate: toBase(Number(newRate5)), packLabel: '5 Pcs Pack' },
            { minQty: 10, inclGstRate: Number(newRate10), baseRate: toBase(Number(newRate10)), packLabel: '10 Pcs Pack' },
            { minQty: 20, inclGstRate: Number(newRate20), baseRate: toBase(Number(newRate20)), packLabel: '20 Pcs Pack' },
          ]
        : [
            { minQty: 1, inclGstRate: Number(newRate1), baseRate: toBase(Number(newRate1)), packLabel: '1 Pc' },
          ];

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        shortName: newName,
        sku: newSku,
        category: newCategory,
        mrp: Number(newMrp),
        gstRatePct: gstPct,
        expiryNote: newExpiry,
        stockQty: Number(newStock),
        reorderLevel: Number(newReorder),
        description: newDesc,
        tiers,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setShowAddModal(false);
      setNewName('');
      setNewSku('');
      setNewDesc('');
      setStatusMessage(`Added product "${data.product.name}".`);
      await onRefresh();
    } else {
      setErrorMessage(data.error || 'Could not create product.');
    }
  }

  async function handleDeleteProduct(product: Product) {
    setErrorMessage('');
    setStatusMessage('');
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok) {
      setStatusMessage(`Removed "${product.name}".`);
      await onRefresh();
    } else {
      setErrorMessage(data.error || 'Cannot delete product.');
    }
  }

  async function handleSaveComboPrice(combo: ComboPack) {
    const nextPrice = comboDrafts[combo.id] ?? combo.comboPriceInclGst;
    const res = await fetch('/api/admin/combos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: combo.id, comboPriceInclGst: Number(nextPrice) }),
    });
    if (res.ok) {
      setStatusMessage(`Updated ${combo.name} rate.`);
      await onRefresh();
    }
  }

  async function handleToggleComboActive(combo: ComboPack) {
    const res = await fetch('/api/admin/combos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: combo.id, isActive: !combo.isActive }),
    });
    if (res.ok) await onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Products, Pricing Tiers &amp; Inventory
          </h2>
          <p className="text-xs text-slate-500">
            Update pack pricing, add new surgical devices, and adjust live stock counts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
        >
          <PackagePlus className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {statusMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-900">
          {errorMessage}
        </div>
      ) : null}

      {/* Product Catalog & Stock Table */}
      <div className="space-y-4">
        {products.map((p) => {
          const adj = stockAdjustMap[p.id] ?? { delta: '', reason: '' };
          const isLow = p.stockQty <= p.reorderLevel;
          return (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {p.sku}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-xs text-slate-500">{p.category}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`text-xs font-semibold ${
                        p.isActive ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {p.name}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 tabular-nums">
                    <span>MRP {formatINR(p.mrp)}</span>
                    <span>GST {p.gstRatePct}%</span>
                    <span>{p.expiryNote}</span>
                    <span>Online cap {p.maxOnlineQty} pcs</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.tiers.map((t) => (
                      <span
                        key={t.minQty}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs tabular-nums text-slate-800"
                      >
                        {t.minQty}+ pcs: {formatINR(t.inclGstRate)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 lg:min-w-[340px]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Current Stock</span>
                    <span
                      className={`font-mono text-sm font-bold tabular-nums ${
                        isLow ? 'text-amber-700' : 'text-slate-900'
                      }`}
                    >
                      {p.stockQty} pcs {isLow ? `(Reorder ≤ ${p.reorderLevel})` : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        void handleStockAdjust(p.id, 10, 'Restock +10 pcs')
                      }
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleStockAdjust(p.id, 50, 'Restock +50 pcs')
                      }
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      +50
                    </button>
                    <input
                      type="number"
                      placeholder="+/-"
                      aria-label={`Adjust stock for ${p.name}`}
                      value={adj.delta}
                      onChange={(e) =>
                        setStockAdjustMap((prev) => ({
                          ...prev,
                          [p.id]: { ...adj, delta: e.target.value },
                        }))
                      }
                      className="w-16 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs tabular-nums"
                    />
                    <input
                      type="text"
                      placeholder="Reason"
                      aria-label={`Reason for ${p.name} stock change`}
                      value={adj.reason}
                      onChange={(e) =>
                        setStockAdjustMap((prev) => ({
                          ...prev,
                          [p.id]: { ...adj, reason: e.target.value },
                        }))
                      }
                      className="min-w-[90px] flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void handleStockAdjust(
                          p.id,
                          parseInt(adj.delta || '0', 10),
                          adj.reason
                        )
                      }
                      className="rounded bg-[#0F172A] px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Apply
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(structuredClone(p))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      Edit Prices &amp; Details
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => void handleDeleteProduct(p)}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Combo Packs Pricing Editor */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-display text-base font-bold text-slate-900">
          Combo Promo Packs Pricing
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Code</th>
                <th className="py-2 px-3 font-semibold">Combo Pack</th>
                <th className="py-2 px-3 text-right font-semibold">
                  Promo Price (Incl. GST)
                </th>
                <th className="py-2 px-3 text-center font-semibold">Active</th>
                <th className="py-2 pl-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {combos.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 pr-3 font-mono text-slate-600">{c.code}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      aria-label={`Price for ${c.name}`}
                      value={comboDrafts[c.id] ?? c.comboPriceInclGst}
                      onChange={(e) =>
                        setComboDrafts((prev) => ({
                          ...prev,
                          [c.id]: Number(e.target.value),
                        }))
                      }
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-right font-mono tabular-nums"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => void handleToggleComboActive(c)}
                      className={`text-xs font-semibold ${
                        c.isActive ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => void handleSaveComboPrice(c)}
                      className="inline-flex items-center gap-1 rounded bg-[#0F172A] px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      <Save className="h-3 w-3" />
                      <span>Save</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveProductEdit}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Edit Product — {editingProduct.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Product Name
                </label>
                <input
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">SKU</label>
                <input
                  value={editingProduct.sku}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, sku: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  MRP (INR)
                </label>
                <input
                  type="number"
                  value={editingProduct.mrp}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      mrp: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Reorder Alert Threshold
                </label>
                <input
                  type="number"
                  value={editingProduct.reorderLevel}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      reorderLevel: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Pack Pricing Tiers
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingProduct({
                      ...editingProduct,
                      tiers: [
                        ...editingProduct.tiers,
                        { minQty: 1, baseRate: 0, inclGstRate: 0 },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Tier</span>
                </button>
              </div>
              <div className="space-y-2">
                {editingProduct.tiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                  >
                    <div>
                      <label className="block text-[11px] text-slate-500">Min Qty</label>
                      <input
                        type="number"
                        value={tier.minQty}
                        onChange={(e) => {
                          const next = [...editingProduct.tiers];
                          next[idx] = { ...tier, minQty: Number(e.target.value) };
                          setEditingProduct({ ...editingProduct, tiers: next });
                        }}
                        className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500">
                        Base Rate (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.baseRate}
                        onChange={(e) => {
                          const next = [...editingProduct.tiers];
                          next[idx] = { ...tier, baseRate: Number(e.target.value) };
                          setEditingProduct({ ...editingProduct, tiers: next });
                        }}
                        className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500">
                        Incl. GST Rate (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.inclGstRate}
                        onChange={(e) => {
                          const next = [...editingProduct.tiers];
                          next[idx] = { ...tier, inclGstRate: Number(e.target.value) };
                          setEditingProduct({ ...editingProduct, tiers: next });
                        }}
                        className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editingProduct.isActive}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      isActive: e.target.checked,
                    })
                  }
                />
                <span>Visible on Customer Calculator</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {/* Add New Product Modal */}
      {showAddModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateProduct}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Add New Medical Device / Accessory
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Product Name *
                </label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. B-HEX® 3.0 Pupil Expander"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">SKU *</label>
                <input
                  required
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="e.g. MID-BHEX-30"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="expander">Pupil Expander (Tiered Packs)</option>
                  <option value="forceps">Surgical Forceps</option>
                  <option value="accessory">Accessory</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  MRP (INR)
                </label>
                <input
                  type="number"
                  value={newMrp}
                  onChange={(e) => setNewMrp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Initial Stock Qty
                </label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  GST Rate (%)
                </label>
                <input
                  type="number"
                  value={newGst}
                  onChange={(e) => setNewGst(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Expiry / Note
                </label>
                <input
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Reorder Alert Level
                </label>
                <input
                  type="number"
                  value={newReorder}
                  onChange={(e) => setNewReorder(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700">
                Description
              </label>
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  1 Pc Rate (Incl GST)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newRate1}
                  onChange={(e) => setNewRate1(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
                />
              </div>
              {newCategory === 'expander' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      5 Pcs Rate/pc
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRate5}
                      onChange={(e) => setNewRate5(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      10 Pcs Rate/pc
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRate10}
                      onChange={(e) => setNewRate10(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      20 Pcs Rate/pc
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRate20}
                      onChange={(e) => setNewRate20(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white"
              >
                Create Product
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
