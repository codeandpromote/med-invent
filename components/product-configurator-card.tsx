'use client';

import { Minus, Plus, MessageSquare } from 'lucide-react';
import {
  calculateProductLine,
  formatINR,
  buildWhatsAppUrl,
} from '@/lib/pricing';
import type { Product } from '@/lib/types';
import { ProductThumbnail } from './product-visuals';

interface ProductConfiguratorCardProps {
  product: Product;
  quantity: number;
  whatsappNumber: string;
  onChangeQuantity: (productId: string, nextQty: number) => void;
}

const ACCENT_SURFACE: Record<Product['accentTheme'], string> = {
  blue: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]',
  lime: 'bg-[#F7FEE7] border-[#D9F99D] text-[#365314]',
  terracotta: 'bg-[#FFF7ED] border-[#FED7AA] text-[#9A3412]',
  crimson: 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]',
  slate: 'bg-slate-50 border-slate-200 text-slate-800',
};

export function ProductConfiguratorCard({
  product,
  quantity,
  whatsappNumber,
  onChangeQuantity,
}: ProductConfiguratorCardProps) {
  const line = calculateProductLine(product, quantity);
  const sortedTiers = [...product.tiers].sort((a, b) => a.minQty - b.minQty);
  const singleTier = sortedTiers[0];
  const isQuotation = line?.requiresQuotation ?? false;

  const quotationHref = buildWhatsAppUrl(
    whatsappNumber,
    `Hello Med Invent Devices, I would like a bulk quotation for ${quantity} pcs of ${product.name} (${product.sku}).`
  );

  const stockNote =
    product.stockQty <= 0
      ? 'Made to order · Confirm availability on WhatsApp'
      : product.stockQty <= product.reorderLevel
        ? `Limited stock (${product.stockQty} pcs ready)`
        : `In stock (${product.stockQty} pcs ready)`;

  return (
    <article
      className="rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm"
      data-testid={`product-card-${product.id}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b px-4 py-2.5 text-xs font-medium ${ACCENT_SURFACE[product.accentTheme]}`}
      >
        <span className="font-semibold tracking-tight">{product.sku}</span>
        <span className="tabular-nums">
          MRP {formatINR(product.mrp)} · {product.expiryNote} · {product.gstRatePct}% GST incl.
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <ProductThumbnail imageKey={product.imageKey} alt={product.name} />
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-slate-900 sm:text-lg">
                {product.name}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {product.description}
              </p>
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                {stockNote}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-500">Starting rate (incl. GST)</div>
              <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                {formatINR(singleTier.inclGstRate)}
                <span className="text-xs font-normal text-slate-500"> / pc</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Decrease ${product.name} quantity`}
                onClick={() => onChangeQuantity(product.id, Math.max(0, quantity - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
              >
                <Minus className="h-4 w-4" />
              </button>
              <label className="sr-only" htmlFor={`qty-${product.id}`}>
                {product.name} quantity
              </label>
              <input
                id={`qty-${product.id}`}
                type="number"
                min={0}
                max={999}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value || '0', 10);
                  onChangeQuantity(
                    product.id,
                    Number.isFinite(parsed) ? Math.max(0, parsed) : 0
                  );
                }}
                className="h-11 w-16 rounded-lg border border-slate-300 bg-white text-center font-mono text-sm font-semibold tabular-nums text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
              <button
                type="button"
                aria-label={`Increase ${product.name} quantity`}
                onClick={() => onChangeQuantity(product.id, quantity + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tier quick-select table */}
        <div className="mt-4 border-t border-slate-100 pt-3.5">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Quick Pack Tier Select (1–{product.maxOnlineQty} pcs)</span>
            <span>Intermediate qty uses lower pack rate</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sortedTiers.map((tier) => {
              const isApplied =
                line !== null &&
                !isQuotation &&
                line.appliedTierMinQty === tier.minQty;
              return (
                <button
                  key={tier.minQty}
                  type="button"
                  onClick={() => onChangeQuantity(product.id, tier.minQty)}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                    isApplied
                      ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1E3A8A]'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {tier.minQty} {tier.minQty === 1 ? 'Pc' : 'Pcs'} Pack
                  </span>
                  <span className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-slate-900">
                    {formatINR(tier.inclGstRate)}/pc
                  </span>
                  <span className="text-[11px] tabular-nums text-slate-500">
                    Base {formatINR(tier.baseRate)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Line Calculation or >20 Quotation Notice */}
        {quantity > 0 ? (
          isQuotation ? (
            <div
              className="mt-3.5 flex flex-col gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between"
              role="status"
            >
              <div>
                <p className="font-semibold">
                  Quantity above {product.maxOnlineQty} pcs — Contact us for a quotation
                </p>
                <p className="mt-0.5 text-amber-800">
                  {quantity} pcs of {product.shortName} will be included as a bulk quotation
                  request on WhatsApp, or request an instant quote now.
                </p>
              </div>
              <a
                href={quotationHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white whitespace-nowrap hover:bg-amber-800"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Request Quote</span>
              </a>
            </div>
          ) : line ? (
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
              <div className="text-slate-700">
                <span className="font-semibold text-slate-900">{quantity} pc(s)</span>{' '}
                billed at{' '}
                <span className="font-semibold text-[#1D4ED8]">
                  Pack {line.appliedTierMinQty}+ tier ({formatINR(line.inclGstUnitRate)}/pc)
                </span>
              </div>
              <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                {formatINR(line.lineTotalInclGst)}
                <span className="ml-1 text-[11px] font-normal text-slate-500">
                  incl. GST
                </span>
              </div>
            </div>
          ) : null
        ) : null}
      </div>
    </article>
  );
}
