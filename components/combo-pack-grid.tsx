'use client';

import { Minus, Plus } from 'lucide-react';
import { formatINR } from '@/lib/pricing';
import type { ComboPack, Product } from '@/lib/types';

interface ComboPackGridProps {
  combos: ComboPack[];
  products: Product[];
  comboQuantities: Record<string, number>;
  distributorDisclaimer: string;
  onChangeComboQuantity: (comboId: string, nextQty: number) => void;
}

const THEME_HEADER: Record<ComboPack['accentTheme'], string> = {
  blue: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]',
  lime: 'bg-[#F7FEE7] border-[#D9F99D] text-[#365314]',
  terracotta: 'bg-[#FFF7ED] border-[#FED7AA] text-[#9A3412]',
};

export function ComboPackGrid({
  combos,
  products,
  comboQuantities,
  distributorDisclaimer,
  onChangeComboQuantity,
}: ComboPackGridProps) {
  const productsById = new Map(products.map((p) => [p.id, p]));

  // Group combos by expander model
  const groups = new Map<string, ComboPack[]>();
  for (const combo of combos) {
    const list = groups.get(combo.expanderProductId) ?? [];
    list.push(combo);
    groups.set(combo.expanderProductId, list);
  }

  return (
    <section id="combos" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Discounted Combo Promo Packs
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Select multiple identical combos or pair combos with additional standalone expanders.
          </p>
        </div>
        <p className="text-xs font-semibold text-red-700">
          {distributorDisclaimer}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from(groups.entries()).map(([expanderId, groupCombos]) => {
          const expProduct = productsById.get(expanderId);
          const theme = groupCombos[0]?.accentTheme ?? 'blue';
          return (
            <div
              key={expanderId}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <div
                className={`border-b px-4 py-3 text-sm font-semibold ${THEME_HEADER[theme]}`}
              >
                {expProduct?.name ?? 'Combo Offer'} + 23G Forceps
              </div>
              <div className="divide-y divide-slate-100 p-4">
                {groupCombos.map((combo) => {
                  const qty = comboQuantities[combo.id] ?? 0;
                  const savingsVsMrp = Math.max(
                    0,
                    combo.mrpTotal - combo.comboPriceInclGst
                  );
                  return (
                    <div
                      key={combo.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {combo.expanderQty} Expanders + {combo.forcepsQty} Forceps
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-600 tabular-nums">
                          <span className="font-mono font-bold text-slate-900">
                            {formatINR(combo.comboPriceInclGst)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Save {formatINR(savingsVsMrp)} vs MRP</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Remove ${combo.name}`}
                          onClick={() =>
                            onChangeComboQuantity(combo.id, Math.max(0, qty - 1))
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span
                          className="w-8 text-center font-mono text-sm font-semibold tabular-nums text-slate-900"
                          aria-label={`${combo.name} count`}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Add ${combo.name}`}
                          onClick={() => onChangeComboQuantity(combo.id, qty + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
