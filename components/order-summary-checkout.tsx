'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { formatINR } from '@/lib/pricing';
import { validateCustomerForm, type CustomerFormErrors } from '@/lib/validation';
import type {
  ComboSuggestion,
  CustomerFormInput,
  OrderRecord,
  PricingBreakdown,
  SiteSettings,
} from '@/lib/types';

interface OrderSummaryCheckoutProps {
  breakdown: PricingBreakdown;
  settings: Omit<SiteSettings, 'portalPasscode'>;
  productQuantities: Record<string, number>;
  comboQuantities: Record<string, number>;
  onApplyComboSuggestion: (suggestion: ComboSuggestion) => void;
  onResetSelection: () => void;
  onOrderCreated: () => void;
}

const EMPTY_CUSTOMER: CustomerFormInput = {
  orderingName: '',
  orderingMobile: '',
  billingAddress: '',
  deliveryAddress: '',
  pinCode: '',
  receivingName: '',
  receivingMobile: '',
  hospitalName: '',
  email: '',
  gstin: '',
  notes: '',
};

export function OrderSummaryCheckout({
  breakdown,
  settings,
  productQuantities,
  comboQuantities,
  onApplyComboSuggestion,
  onResetSelection,
  onOrderCreated,
}: OrderSummaryCheckoutProps) {
  const [customer, setCustomer] = useState<CustomerFormInput>(EMPTY_CUSTOMER);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [sameAsOrdering, setSameAsOrdering] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CustomerFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    order: OrderRecord;
    whatsappUrl: string;
  } | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const hasAnyItems =
    breakdown.productLines.length > 0 ||
    breakdown.comboLines.length > 0 ||
    breakdown.quotationProducts.length > 0;

  function updateField<K extends keyof CustomerFormInput>(
    key: K,
    value: CustomerFormInput[K]
  ) {
    setCustomer((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'billingAddress' && sameAsBilling) {
        next.deliveryAddress = value;
      }
      if (key === 'orderingName' && sameAsOrdering) {
        next.receivingName = value;
      }
      if (key === 'orderingMobile' && sameAsOrdering) {
        next.receivingMobile = value;
      }
      return next;
    });
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function toggleSameAsBilling(checked: boolean) {
    setSameAsBilling(checked);
    if (checked) {
      setCustomer((prev) => ({ ...prev, deliveryAddress: prev.billingAddress }));
      setFieldErrors((prev) => ({ ...prev, deliveryAddress: undefined }));
    }
  }

  function toggleSameAsOrdering(checked: boolean) {
    setSameAsOrdering(checked);
    if (checked) {
      setCustomer((prev) => ({
        ...prev,
        receivingName: prev.orderingName,
        receivingMobile: prev.orderingMobile,
      }));
      setFieldErrors((prev) => ({
        ...prev,
        receivingName: undefined,
        receivingMobile: undefined,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!hasAnyItems) {
      setSubmitError(
        'Please select at least one pupil expander, forceps, or combo pack above.'
      );
      return;
    }

    const errors = validateCustomerForm(customer);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Please fix the highlighted compulsory fields below.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          productQuantities,
          comboQuantities,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setSubmitError(data.error || 'Could not submit order request.');
        return;
      }
      setSubmittedResult({ order: data.order, whatsappUrl: data.whatsappUrl });
      onOrderCreated();
    } catch {
      setSubmitError('Network error while recording order request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyWhatsAppText() {
    if (!submittedResult) return;
    try {
      await navigator.clipboard.writeText(submittedResult.order.whatsappMessage);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2500);
    } catch {
      setCopiedMsg(false);
    }
  }

  return (
    <aside id="checkout-summary" className="space-y-5 lg:sticky lg:top-6">
      {/* Pricing Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Order Request Summary
            </h2>
            <p className="text-xs text-slate-500">
              {breakdown.totalUnitsExpanders} Expanders · {breakdown.totalUnitsForceps} Forceps
            </p>
          </div>
          {hasAnyItems ? (
            <button
              type="button"
              onClick={onResetSelection}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          ) : null}
        </div>

        {/* Smart Combo Suggestion */}
        {breakdown.comboSuggestion ? (
          <div
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-950"
            data-testid="combo-suggestion-banner"
          >
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-emerald-900">
                  Combo Savings Available — Save{' '}
                  <span className="font-mono tabular-nums">
                    {formatINR(breakdown.comboSuggestion.savingsAmount)}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                  {breakdown.comboSuggestion.description}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs tabular-nums text-emerald-800">
                    {formatINR(breakdown.comboSuggestion.currentCombinedTotal)} →{' '}
                    <strong className="text-emerald-950">
                      {formatINR(breakdown.comboSuggestion.suggestedCombinedTotal)}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onApplyComboSuggestion(breakdown.comboSuggestion!)}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
                  >
                    Apply Combo &amp; Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Itemized Line Items */}
        <div className="mt-4 space-y-2.5 text-sm">
          {!hasAnyItems ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-xs text-slate-500">
              Select pupil expanders, forceps, or combo packs to see itemized rates and GST breakdown.
            </div>
          ) : (
            <>
              {breakdown.productLines.map((line) => (
                <div
                  key={line.productId}
                  className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">
                      {line.name} × {line.quantity}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      Pack {line.appliedTierMinQty}+ tier @ {formatINR(line.inclGstUnitRate)}/pc
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-900">
                    {formatINR(line.lineTotalInclGst)}
                  </div>
                </div>
              ))}

              {breakdown.comboLines.map((cLine) => (
                <div
                  key={cLine.comboId}
                  className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">
                      {cLine.name} × {cLine.quantity}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      Promo Pack @ {formatINR(cLine.unitPriceInclGst)} each
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-900">
                    {formatINR(cLine.lineTotalInclGst)}
                  </div>
                </div>
              ))}

              {breakdown.quotationProducts.map((qLine) => (
                <div
                  key={qLine.productId}
                  className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5 text-amber-900"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {qLine.name} × {qLine.quantity} pcs
                    </div>
                    <div className="text-xs text-amber-700">
                      Bulk quantity (&gt;20 pcs) — Contact for quotation
                    </div>
                  </div>
                  <div className="shrink-0 text-xs font-semibold">Quotation</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Totals Breakdown */}
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3.5 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Taxable Base Value</span>
            <span className="font-mono tabular-nums text-slate-800">
              {formatINR(breakdown.subtotalBase)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Included GST Component</span>
            <span className="font-mono tabular-nums text-slate-800">
              {formatINR(breakdown.totalGstAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pan-India Shipping</span>
            <span className="font-semibold text-emerald-700">FREE (₹0)</span>
          </div>
          {breakdown.totalSavingsVsMrp > 0 ? (
            <div className="flex items-center justify-between text-emerald-700">
              <span>Total Savings vs MRP</span>
              <span className="font-mono font-semibold tabular-nums">
                -{formatINR(breakdown.totalSavingsVsMrp)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 text-base font-bold text-slate-900">
            <span>Total Payable (INR)</span>
            <span
              className="font-mono text-lg tabular-nums text-[#0F172A]"
              data-testid="grand-total-display"
            >
              {formatINR(breakdown.grandTotalInclGst)}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {settings.deliveryCoverageNote}
          </p>
        </div>
      </div>

      {/* Customer & Delivery Details Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="font-display text-lg font-bold text-slate-900">
          Customer &amp; Delivery Details
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Fields marked * are compulsory. Submission records an order request and opens
          an itemized WhatsApp message to {settings.displayPhone}.
        </p>

        <div className="mt-4 space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="orderingName"
                className="block text-xs font-semibold text-slate-700"
              >
                Person Ordering Name *
              </label>
              <input
                id="orderingName"
                name="orderingName"
                type="text"
                value={customer.orderingName}
                onChange={(e) => updateField('orderingName', e.target.value)}
                placeholder="e.g. Dr. Arvind Sen"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  fieldErrors.orderingName
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/20'
                }`}
              />
              {fieldErrors.orderingName ? (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.orderingName}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="orderingMobile"
                className="block text-xs font-semibold text-slate-700"
              >
                Ordering Mobile (10 digits) *
              </label>
              <input
                id="orderingMobile"
                name="orderingMobile"
                type="tel"
                inputMode="numeric"
                value={customer.orderingMobile}
                onChange={(e) => updateField('orderingMobile', e.target.value)}
                placeholder="98XXXXXXXX"
                className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  fieldErrors.orderingMobile
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/20'
                }`}
              />
              {fieldErrors.orderingMobile ? (
                <p className="mt-1 text-xs text-red-700">
                  {fieldErrors.orderingMobile}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="billingAddress"
              className="block text-xs font-semibold text-slate-700"
            >
              Billing Address (India) *
            </label>
            <textarea
              id="billingAddress"
              name="billingAddress"
              rows={2}
              value={customer.billingAddress}
              onChange={(e) => updateField('billingAddress', e.target.value)}
              placeholder="Clinic / Hospital street address, city, state"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                fieldErrors.billingAddress
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/20'
              }`}
            />
            {fieldErrors.billingAddress ? (
              <p className="mt-1 text-xs text-red-700">{fieldErrors.billingAddress}</p>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="deliveryAddress"
                className="block text-xs font-semibold text-slate-700"
              >
                Delivery Address (India) *
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => toggleSameAsBilling(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#1D4ED8]"
                />
                <span>Same as billing</span>
              </label>
            </div>
            <textarea
              id="deliveryAddress"
              name="deliveryAddress"
              rows={2}
              value={customer.deliveryAddress}
              onChange={(e) => {
                setSameAsBilling(false);
                updateField('deliveryAddress', e.target.value);
              }}
              placeholder="Delivery street address, landmark, city, state"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                fieldErrors.deliveryAddress
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/20'
              }`}
            />
            {fieldErrors.deliveryAddress ? (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.deliveryAddress}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pinCode"
                className="block text-xs font-semibold text-slate-700"
              >
                PIN Code (6 digits) *
              </label>
              <input
                id="pinCode"
                name="pinCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={customer.pinCode}
                onChange={(e) => updateField('pinCode', e.target.value)}
                placeholder="e.g. 700071"
                className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  fieldErrors.pinCode
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/20'
                }`}
              />
              {fieldErrors.pinCode ? (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.pinCode}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="hospitalName"
                className="block text-xs font-semibold text-slate-700"
              >
                Hospital / Clinic Name (Optional)
              </label>
              <input
                id="hospitalName"
                name="hospitalName"
                type="text"
                value={customer.hospitalName}
                onChange={(e) => updateField('hospitalName', e.target.value)}
                placeholder="e.g. Netra Eye Centre"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Receiving Contact
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={sameAsOrdering}
                  onChange={(e) => toggleSameAsOrdering(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#1D4ED8]"
                />
                <span>Same as person ordering</span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="receivingName"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Person Receiving Name *
                </label>
                <input
                  id="receivingName"
                  name="receivingName"
                  type="text"
                  value={customer.receivingName}
                  onChange={(e) => {
                    setSameAsOrdering(false);
                    updateField('receivingName', e.target.value);
                  }}
                  placeholder="OT Store / Receiver name"
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    fieldErrors.receivingName
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/20'
                  }`}
                />
                {fieldErrors.receivingName ? (
                  <p className="mt-1 text-xs text-red-700">
                    {fieldErrors.receivingName}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="receivingMobile"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Receiving Mobile (10 digits) *
                </label>
                <input
                  id="receivingMobile"
                  name="receivingMobile"
                  type="tel"
                  inputMode="numeric"
                  value={customer.receivingMobile}
                  onChange={(e) => {
                    setSameAsOrdering(false);
                    updateField('receivingMobile', e.target.value);
                  }}
                  placeholder="98XXXXXXXX"
                  className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    fieldErrors.receivingMobile
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/20'
                  }`}
                />
                {fieldErrors.receivingMobile ? (
                  <p className="mt-1 text-xs text-red-700">
                    {fieldErrors.receivingMobile}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700"
              >
                Email Address (Optional)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={customer.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="doctor@clinic.in"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  fieldErrors.email
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/20'
                }`}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="gstin"
                className="block text-xs font-semibold text-slate-700"
              >
                GSTIN for Tax Invoice (Optional)
              </label>
              <input
                id="gstin"
                name="gstin"
                type="text"
                maxLength={15}
                value={customer.gstin}
                onChange={(e) => updateField('gstin', e.target.value.toUpperCase())}
                placeholder="15-character GSTIN"
                className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm uppercase text-slate-900 focus:outline-none focus:ring-2 ${
                  fieldErrors.gstin
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/20'
                }`}
              />
              {fieldErrors.gstin ? (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.gstin}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-xs font-semibold text-slate-700"
            >
              Dispatch or OT Note (Optional)
            </label>
            <input
              id="notes"
              name="notes"
              type="text"
              value={customer.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Optional delivery instructions"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>
        </div>

        {submitError ? (
          <div
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
            role="alert"
          >
            {submitError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#15803D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#166534] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D]/50 disabled:opacity-60"
        >
          <MessageSquare className="h-4 w-4" />
          <span>
            {submitting ? 'Preparing Order Request...' : 'Send order request on WhatsApp'}
          </span>
        </button>

        {/* Customer-Facing Ordering Terms */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-semibold text-slate-800">
            Ordering &amp; Payment Terms
          </h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-slate-600">
            {settings.terms.map((term, idx) => (
              <li key={idx}>{term}</li>
            ))}
          </ol>
        </div>
      </form>

      {/* Post-Submission Confirmation Modal */}
      {submittedResult ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                <div>
                  <h3
                    id="order-modal-title"
                    className="font-display text-lg font-bold text-slate-900"
                  >
                    Order Request Ready
                  </h3>
                  <p className="font-mono text-xs text-slate-500">
                    Reference: {submittedResult.order.orderNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close confirmation dialog"
                onClick={() => setSubmittedResult(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Your order request has been saved. Click below to open your itemized message
              in WhatsApp for{' '}
              <span className="font-semibold text-slate-900">
                {settings.displayPhone}
              </span>
              . Our team will confirm availability, INR payment instructions, and dispatch
              timing directly on WhatsApp.
            </p>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Itemized WhatsApp Message Preview</span>
                <button
                  type="button"
                  onClick={handleCopyWhatsAppText}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedMsg ? 'Copied' : 'Copy text'}</span>
                </button>
              </div>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700">
                {submittedResult.order.whatsappMessage}
              </pre>
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <a
                href={submittedResult.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#15803D] px-4 py-3 text-sm font-semibold text-white hover:bg-[#166534]"
              >
                <span>Open in WhatsApp</span>
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setSubmittedResult(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
