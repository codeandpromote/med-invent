import type {
  CalculatedComboLine,
  CalculatedProductLine,
  ComboPack,
  ComboSuggestion,
  CustomerFormInput,
  PricingBreakdown,
  Product,
  ProductTier,
  SiteSettings,
} from './types';

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(amount: number): string {
  const rounded = roundCurrency(amount);
  const hasDecimals = Math.abs(rounded - Math.round(rounded)) > 0.001;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(rounded);
}

/**
 * Resolves the applicable tier for any quantity 1..maxOnlineQty.
 * Per Med Invent Devices pricing guidelines:
 * "If a number is between two packs is selected, the rate for the lower pack will apply.
 * For 7 pieces of B-HEX the rate for 5 pieces will apply = Rs 11025."
 */
export function resolveApplicableTier(tiers: ProductTier[], quantity: number): ProductTier {
  if (!tiers.length) {
    throw new Error('Product must have at least one pricing tier');
  }
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let applicable = sorted[0];
  for (const tier of sorted) {
    if (quantity >= tier.minQty) {
      applicable = tier;
    } else {
      break;
    }
  }
  return applicable;
}

export function calculateProductLine(product: Product, rawQty: number): CalculatedProductLine | null {
  const quantity = Math.max(0, Math.floor(Number.isFinite(rawQty) ? rawQty : 0));
  if (quantity <= 0) return null;

  const requiresQuotation = product.maxOnlineQty > 0 && quantity > product.maxOnlineQty;
  const tier = resolveApplicableTier(product.tiers, Math.min(quantity, Math.max(1, product.maxOnlineQty)));

  if (requiresQuotation) {
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      shortName: product.shortName,
      category: product.category,
      quantity,
      requiresQuotation: true,
      appliedTierMinQty: tier.minQty,
      baseUnitRate: 0,
      inclGstUnitRate: 0,
      lineBaseTotal: 0,
      lineGstAmount: 0,
      lineTotalInclGst: 0,
      mrpSavings: 0,
    };
  }

  const lineTotalInclGst = roundCurrency(tier.inclGstRate * quantity);
  const lineBaseTotal = roundCurrency(tier.baseRate * quantity);
  const lineGstAmount = roundCurrency(lineTotalInclGst - lineBaseTotal);
  const mrpSavings = roundCurrency(Math.max(0, product.mrp * quantity - lineTotalInclGst));

  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    shortName: product.shortName,
    category: product.category,
    quantity,
    requiresQuotation: false,
    appliedTierMinQty: tier.minQty,
    baseUnitRate: tier.baseRate,
    inclGstUnitRate: tier.inclGstRate,
    lineBaseTotal,
    lineGstAmount,
    lineTotalInclGst,
    mrpSavings,
  };
}

/**
 * Evaluates whether switching standalone expanders + forceps into a published Combo Pack
 * results in a strictly cheaper total (savings > 0).
 */
export function findBestComboSuggestion(
  products: Product[],
  combos: ComboPack[],
  productQuantities: Record<string, number>
): ComboSuggestion | null {
  const activeProductsById = new Map(products.filter((p) => p.isActive).map((p) => [p.id, p]));
  const activeCombos = combos.filter((c) => c.isActive);

  let bestSuggestion: ComboSuggestion | null = null;

  // Group eligible combos by (expanderProductId, forcepsProductId)
  for (const combo of activeCombos) {
    const expander = activeProductsById.get(combo.expanderProductId);
    const forceps = activeProductsById.get(combo.forcepsProductId);
    if (!expander || !forceps) continue;

    const expQty = Math.floor(productQuantities[expander.id] ?? 0);
    const forcepQty = Math.floor(productQuantities[forceps.id] ?? 0);

    if (expQty <= 0 || forcepQty <= 0) continue;
    if (expander.maxOnlineQty > 0 && expQty > expander.maxOnlineQty) continue;
    if (forceps.maxOnlineQty > 0 && forcepQty > forceps.maxOnlineQty) continue;

    const maxPossibleCombos = Math.min(
      Math.floor(expQty / combo.expanderQty),
      Math.floor(forcepQty / combo.forcepsQty)
    );
    if (maxPossibleCombos < 1) continue;

    const currentExpLine = calculateProductLine(expander, expQty);
    const currentForcepLine = calculateProductLine(forceps, forcepQty);
    if (!currentExpLine || !currentForcepLine) continue;

    const currentCombinedTotal = roundCurrency(
      currentExpLine.lineTotalInclGst + currentForcepLine.lineTotalInclGst
    );

    // Check 1 up to maxPossibleCombos to see which count maximizes savings
    for (let count = 1; count <= maxPossibleCombos; count++) {
      const remExp = expQty - count * combo.expanderQty;
      const remForceps = forcepQty - count * combo.forcepsQty;

      const remExpTotal =
        remExp > 0 ? calculateProductLine(expander, remExp)?.lineTotalInclGst ?? 0 : 0;
      const remForcepTotal =
        remForceps > 0 ? calculateProductLine(forceps, remForceps)?.lineTotalInclGst ?? 0 : 0;

      const suggestedCombinedTotal = roundCurrency(
        count * combo.comboPriceInclGst + remExpTotal + remForcepTotal
      );
      const savingsAmount = roundCurrency(currentCombinedTotal - suggestedCombinedTotal);

      if (savingsAmount > 0.5) {
        if (!bestSuggestion || savingsAmount > bestSuggestion.savingsAmount) {
          bestSuggestion = {
            comboId: combo.id,
            comboName: combo.name,
            comboCount: count,
            expanderProductId: expander.id,
            expanderName: expander.shortName,
            forcepsProductId: forceps.id,
            remainingExpanderQty: remExp,
            remainingForcepsQty: remForceps,
            currentCombinedTotal,
            suggestedCombinedTotal,
            savingsAmount,
            description:
              remExp > 0 || remForceps > 0
                ? `Switch to ${count}x ${combo.name}${remExp > 0 ? ` + ${remExp} extra ${expander.shortName}` : ''}${remForceps > 0 ? ` + ${remForceps} extra Forceps` : ''} to save ${formatINR(savingsAmount)}.`
                : `Switch to ${count}x ${combo.name} and save ${formatINR(savingsAmount)} with promo pricing.`,
          };
        }
      }
    }
  }

  return bestSuggestion;
}

export function calculateOrderBreakdown(
  products: Product[],
  combos: ComboPack[],
  productQuantities: Record<string, number>,
  comboQuantities: Record<string, number>
): PricingBreakdown {
  const activeProducts = products.filter((p) => p.isActive);
  const productsById = new Map(activeProducts.map((p) => [p.id, p]));
  const activeCombos = combos.filter((c) => c.isActive);

  const productLines: CalculatedProductLine[] = [];
  const quotationProducts: CalculatedProductLine[] = [];

  for (const product of activeProducts) {
    const qty = productQuantities[product.id] ?? 0;
    const line = calculateProductLine(product, qty);
    if (!line) continue;
    if (line.requiresQuotation) {
      quotationProducts.push(line);
    } else {
      productLines.push(line);
    }
  }

  const comboLines: CalculatedComboLine[] = [];
  for (const combo of activeCombos) {
    const qty = Math.max(0, Math.floor(comboQuantities[combo.id] ?? 0));
    if (qty <= 0) continue;

    const expander = productsById.get(combo.expanderProductId);
    const forceps = productsById.get(combo.forcepsProductId);
    const expSingleRate = expander ? resolveApplicableTier(expander.tiers, 1).inclGstRate : 0;
    const forcepSingleRate = forceps ? resolveApplicableTier(forceps.tiers, 1).inclGstRate : 0;

    const standaloneEquivalentTotal = roundCurrency(
      qty * (combo.expanderQty * expSingleRate + combo.forcepsQty * forcepSingleRate)
    );
    const lineTotalInclGst = roundCurrency(qty * combo.comboPriceInclGst);
    const comboSavings = roundCurrency(Math.max(0, standaloneEquivalentTotal - lineTotalInclGst));

    comboLines.push({
      comboId: combo.id,
      code: combo.code,
      name: combo.name,
      quantity: qty,
      expanderProductId: combo.expanderProductId,
      expanderQtyPerCombo: combo.expanderQty,
      forcepsProductId: combo.forcepsProductId,
      forcepsQtyPerCombo: combo.forcepsQty,
      unitPriceInclGst: combo.comboPriceInclGst,
      lineTotalInclGst,
      standaloneEquivalentTotal,
      comboSavings,
    });
  }

  let totalUnitsExpanders = 0;
  let totalUnitsForceps = 0;
  let subtotalBase = 0;
  let totalGstAmount = 0;
  let grandTotalInclGst = 0;
  let totalMrpValue = 0;

  for (const line of productLines) {
    const product = productsById.get(line.productId);
    if (line.category === 'expander') totalUnitsExpanders += line.quantity;
    if (line.category === 'forceps') totalUnitsForceps += line.quantity;

    subtotalBase = roundCurrency(subtotalBase + line.lineBaseTotal);
    totalGstAmount = roundCurrency(totalGstAmount + line.lineGstAmount);
    grandTotalInclGst = roundCurrency(grandTotalInclGst + line.lineTotalInclGst);
    totalMrpValue = roundCurrency(totalMrpValue + (product ? product.mrp * line.quantity : 0));
  }

  for (const cLine of comboLines) {
    const combo = activeCombos.find((c) => c.id === cLine.comboId);
    totalUnitsExpanders += cLine.quantity * cLine.expanderQtyPerCombo;
    totalUnitsForceps += cLine.quantity * cLine.forcepsQtyPerCombo;

    // Approximate GST breakdown for combo (5% on expander portion, 12% or 5% on forceps;
    // display transparent inclusive total & embedded GST)
    const expProduct = combo ? productsById.get(combo.expanderProductId) : undefined;
    const gstPct = expProduct?.gstRatePct ?? 5;
    const basePart = roundCurrency(cLine.lineTotalInclGst / (1 + gstPct / 100));
    const gstPart = roundCurrency(cLine.lineTotalInclGst - basePart);

    subtotalBase = roundCurrency(subtotalBase + basePart);
    totalGstAmount = roundCurrency(totalGstAmount + gstPart);
    grandTotalInclGst = roundCurrency(grandTotalInclGst + cLine.lineTotalInclGst);
    totalMrpValue = roundCurrency(totalMrpValue + (combo ? combo.mrpTotal * cLine.quantity : 0));
  }

  const totalSavingsVsMrp = roundCurrency(Math.max(0, totalMrpValue - grandTotalInclGst));
  const comboSuggestion = findBestComboSuggestion(products, combos, productQuantities);

  return {
    productLines,
    comboLines,
    quotationProducts,
    hasQuotationItems: quotationProducts.length > 0,
    totalUnitsExpanders,
    totalUnitsForceps,
    subtotalBase,
    totalGstAmount,
    grandTotalInclGst,
    totalMrpValue,
    totalSavingsVsMrp,
    shippingFee: 0,
    comboSuggestion,
  };
}

export function buildWhatsAppMessage(params: {
  orderNumber: string;
  breakdown: PricingBreakdown;
  customer: CustomerFormInput;
  settings: SiteSettings;
}): string {
  const { orderNumber, breakdown, customer, settings } = params;
  const lines: string[] = [];

  lines.push(`*ORDER REQUEST — ${settings.companyName}*`);
  lines.push(`Ref: ${orderNumber}`);
  lines.push(`--------------------------------`);
  lines.push(`*ITEMS SELECTED:*`);

  for (const item of breakdown.productLines) {
    lines.push(
      `• ${item.name} × ${item.quantity} pc(s) [Pack ${item.appliedTierMinQty}+ rate @ ${formatINR(item.inclGstUnitRate)}/pc] = *${formatINR(item.lineTotalInclGst)}*`
    );
  }

  for (const combo of breakdown.comboLines) {
    lines.push(
      `• ${combo.name} × ${combo.quantity} pack(s) @ ${formatINR(combo.unitPriceInclGst)} = *${formatINR(combo.lineTotalInclGst)}*`
    );
  }

  if (breakdown.quotationProducts.length > 0) {
    lines.push(``);
    lines.push(`*BULK QUOTATION REQUESTED (>20 pcs):*`);
    for (const qItem of breakdown.quotationProducts) {
      lines.push(`• ${qItem.name} × ${qItem.quantity} pcs — Contact for quotation`);
    }
  }

  lines.push(`--------------------------------`);
  if (breakdown.grandTotalInclGst > 0) {
    lines.push(`*TOTAL PAYABLE (Incl. GST & Free Shipping): ${formatINR(breakdown.grandTotalInclGst)}*`);
    lines.push(`(Includes GST ~${formatINR(breakdown.totalGstAmount)} · Free India Delivery)`);
  }
  lines.push(``);
  lines.push(`*CUSTOMER & DELIVERY DETAILS (INDIA):*`);
  lines.push(`Ordering Person: ${customer.orderingName}`);
  lines.push(`Ordering Mobile: ${customer.orderingMobile}`);
  lines.push(`Receiving Person: ${customer.receivingName}`);
  lines.push(`Receiving Mobile: ${customer.receivingMobile}`);
  if (customer.hospitalName.trim()) {
    lines.push(`Hospital / Clinic: ${customer.hospitalName.trim()}`);
  }
  lines.push(`Billing Address: ${customer.billingAddress}`);
  lines.push(`Delivery Address: ${customer.deliveryAddress}`);
  lines.push(`PIN Code: ${customer.pinCode}`);
  if (customer.email.trim()) {
    lines.push(`Email: ${customer.email.trim()}`);
  }
  if (customer.gstin.trim()) {
    lines.push(`GSTIN: ${customer.gstin.trim().toUpperCase()}`);
  }
  if (customer.notes.trim()) {
    lines.push(`Order Note: ${customer.notes.trim()}`);
  }
  lines.push(`--------------------------------`);
  lines.push(`Please confirm stock availability, INR payment details, and dispatch timeline.`);

  return lines.join('\n');
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const digitsOnly = whatsappNumber.replace(/\D/g, '');
  const normalized = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
