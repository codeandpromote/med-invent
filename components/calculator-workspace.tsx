'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, Phone, ShieldCheck, Truck } from 'lucide-react';
import { calculateOrderBreakdown, formatINR } from '@/lib/pricing';
import type {
  ComboPack,
  ComboSuggestion,
  Product,
  SiteSettings,
} from '@/lib/types';
import { ComboPackGrid } from './combo-pack-grid';
import { CustomerPortalGate } from './customer-portal-gate';
import { OrderSummaryCheckout } from './order-summary-checkout';
import { ProductConfiguratorCard } from './product-configurator-card';
import { HeroDeviceVisual, OfficialRateCardPreview } from './product-visuals';

interface CatalogResponse {
  products: Product[];
  combos: ComboPack[];
  settings: Omit<SiteSettings, 'portalPasscode'>;
  portalUnlocked: boolean;
}

export function CalculatorWorkspace() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [comboQuantities, setComboQuantities] = useState<Record<string, number>>({});
  const [showRateCard, setShowRateCard] = useState(false);

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load catalog');
      const data = (await res.json()) as CatalogResponse;
      setLoadError('');
      setCatalog(data);
    } catch {
      setLoadError('Unable to load Med Invent Devices pricing catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/catalog', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load catalog');
        const data = (await res.json()) as CatalogResponse;
        if (!active) return;
        setLoadError('');
        setCatalog(data);
      } catch {
        if (active) setLoadError('Unable to load Med Invent Devices pricing catalog.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const breakdown = useMemo(() => {
    if (!catalog) {
      return calculateOrderBreakdown([], [], {}, {});
    }
    return calculateOrderBreakdown(
      catalog.products,
      catalog.combos,
      productQuantities,
      comboQuantities
    );
  }, [catalog, productQuantities, comboQuantities]);

  function handleChangeProductQty(productId: string, nextQty: number) {
    setProductQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, nextQty),
    }));
  }

  function handleChangeComboQty(comboId: string, nextQty: number) {
    setComboQuantities((prev) => ({
      ...prev,
      [comboId]: Math.max(0, nextQty),
    }));
  }

  function handleApplyComboSuggestion(suggestion: ComboSuggestion) {
    setProductQuantities((prev) => ({
      ...prev,
      [suggestion.expanderProductId]: suggestion.remainingExpanderQty,
      [suggestion.forcepsProductId]: suggestion.remainingForcepsQty,
    }));
    setComboQuantities((prev) => ({
      ...prev,
      [suggestion.comboId]: (prev[suggestion.comboId] ?? 0) + suggestion.comboCount,
    }));
  }

  function handleResetSelection() {
    setProductQuantities({});
    setComboQuantities({});
  }

  const settings = catalog?.settings;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-4 sm:px-6">
          <a
            href={settings?.websiteUrl ?? 'https://www.medinventdevices.com/corporate/index2.php'}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Med Invent Devices
          </a>

          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex"
          >
            <a
              href="#calculator"
              className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Calculator
            </a>
            <a
              href="#combos"
              className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Combo Packs
            </a>
            <a
              href="#rate-card"
              className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Rate Card
            </a>
            <Link
              href="/admin"
              className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Admin Console
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`https://wa.me/${settings?.whatsappNumber ?? '919051112020'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{settings?.displayPhone ?? '+91 90511 12020'}</span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-16">
        {loading ? (
          <div className="space-y-4 py-12">
            <div className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-7" />
              <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-5" />
            </div>
          </div>
        ) : loadError ? (
          <div className="my-12 rounded-xl border border-red-200 bg-white p-6 text-center">
            <p className="text-sm font-medium text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={() => void fetchCatalog()}
              className="mt-3 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : catalog && !catalog.portalUnlocked ? (
          <CustomerPortalGate
            companyName={catalog.settings.companyName}
            displayPhone={catalog.settings.displayPhone}
            supportEmail={catalog.settings.supportEmail}
            onUnlocked={() => void fetchCatalog()}
          />
        ) : catalog ? (
          <>
            {/* Compact Clinical Hero Split */}
            <section className="mb-8 grid grid-cols-1 items-stretch gap-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7 lg:grid-cols-12">
              <div className="flex flex-col justify-between lg:col-span-7">
                <div>
                  <p className="text-xs font-medium text-[#1D4ED8]">
                    {catalog.settings.companyName} · Direct India Customer Pricing
                  </p>
                  <h1 className="mt-2 max-w-2xl font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
                    Pupil Expander &amp; 23G Forceps Order Calculator
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                    Select individual packs from 1 to 20 pcs, combine discounted promo
                    combos, view exact GST-inclusive totals with free shipping across
                    India, and submit an itemized order request on WhatsApp.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-700 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#1D4ED8]" />
                    <span>All rates inclusive of GST</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span>Free shipping within India</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-start">
                    <Link
                      href="/admin"
                      className="font-semibold text-[#1D4ED8] hover:underline md:hidden"
                    >
                      Admin Console
                    </Link>
                    <a
                      href="#calculator"
                      className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:underline"
                    >
                      <span>Start selecting</span>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <HeroDeviceVisual />
              </div>
            </section>

            {/* Main 2-Column Calculator & Checkout Grid */}
            <div
              id="calculator"
              className="grid grid-cols-1 gap-7 lg:grid-cols-12 lg:items-start"
            >
              <div className="space-y-8 lg:col-span-7">
                <section className="space-y-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      01. Select Pupil Expanders &amp; 23G Forceps
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Enter any quantity from 1 to 20 pcs. Intermediate quantities
                      automatically receive the lower pack tier rate.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {catalog.products.map((product) => (
                      <ProductConfiguratorCard
                        key={product.id}
                        product={product}
                        quantity={productQuantities[product.id] ?? 0}
                        whatsappNumber={catalog.settings.whatsappNumber}
                        onChangeQuantity={handleChangeProductQty}
                      />
                    ))}
                  </div>
                </section>

                <ComboPackGrid
                  combos={catalog.combos}
                  products={catalog.products}
                  comboQuantities={comboQuantities}
                  distributorDisclaimer={catalog.settings.distributorDisclaimer}
                  onChangeComboQuantity={handleChangeComboQty}
                />

                {/* Official Reference Rate Card Toggle */}
                <section
                  id="rate-card"
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Official Customer Rate Sheet Reference
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Verify published pack tiers, MRP, and combo pricing directly
                        against the Med Invent Devices rate card.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRateCard((prev) => !prev)}
                      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      {showRateCard ? 'Hide Rate Sheet' : 'View Official Rate Sheet'}
                    </button>
                  </div>
                  {showRateCard ? (
                    <div className="mt-4">
                      <OfficialRateCardPreview />
                    </div>
                  ) : null}
                </section>
              </div>

              <div className="lg:col-span-5">
                <OrderSummaryCheckout
                  breakdown={breakdown}
                  settings={catalog.settings}
                  productQuantities={productQuantities}
                  comboQuantities={comboQuantities}
                  onApplyComboSuggestion={handleApplyComboSuggestion}
                  onResetSelection={handleResetSelection}
                  onOrderCreated={() => void fetchCatalog()}
                />
              </div>
            </div>
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
          <p>{settings?.patentFooterNote}</p>
          <div className="flex items-center gap-4 whitespace-nowrap">
            <a
              href={settings?.websiteUrl ?? 'https://www.medinventdevices.com/corporate/index2.php'}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 hover:underline"
            >
              medinventdevices.com
            </a>
            <Link href="/admin" className="hover:text-slate-900 hover:underline">
              Admin Panel
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Compact Sticky Summary Bar (<= 15% mobile viewport height) */}
      {catalog?.portalUnlocked ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500">
                {breakdown.totalUnitsExpanders} Exp · {breakdown.totalUnitsForceps} Frc · Free Shipping
              </div>
              <div className="font-mono text-base font-bold tabular-nums text-slate-900">
                {formatINR(breakdown.grandTotalInclGst)}
              </div>
            </div>
            <a
              href="#checkout-summary"
              className="rounded-lg bg-[#15803D] px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap"
            >
              Review &amp; Send
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
