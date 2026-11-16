export type ProductCategory = 'expander' | 'forceps' | 'accessory';

export interface ProductTier {
  minQty: number;
  baseRate: number;
  inclGstRate: number;
  packLabel?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  mrp: number;
  expiryNote: string;
  gstRatePct: number;
  description: string;
  accentTheme: 'blue' | 'lime' | 'terracotta' | 'crimson' | 'slate';
  imageKey: 'expander' | 'forceps' | 'hero';
  maxOnlineQty: number;
  stockQty: number;
  reorderLevel: number;
  isActive: boolean;
  tiers: ProductTier[];
}

export interface ComboPack {
  id: string;
  code: string;
  name: string;
  expanderProductId: string;
  expanderQty: number;
  forcepsProductId: string;
  forcepsQty: number;
  comboPriceInclGst: number;
  mrpTotal: number;
  accentTheme: 'blue' | 'lime' | 'terracotta';
  isActive: boolean;
}

export interface SiteSettings {
  companyName: string;
  websiteUrl: string;
  whatsappNumber: string; // e.g. 919051112020
  displayPhone: string;   // e.g. +91 90511 12020
  supportEmail: string;
  promoBannerText: string;
  deliveryCoverageNote: string;
  distributorDisclaimer: string;
  patentFooterNote: string;
  terms: string[];
  portalPasscodeEnabled: boolean;
  portalPasscode: string;
}

export interface CustomerFormInput {
  orderingName: string;
  orderingMobile: string;
  billingAddress: string;
  deliveryAddress: string;
  pinCode: string;
  receivingName: string;
  receivingMobile: string;
  hospitalName: string;
  email: string;
  gstin: string;
  notes: string;
}

export type OrderStatus =
  | 'Pending WhatsApp'
  | 'Payment Sent'
  | 'Confirmed'
  | 'Dispatched'
  | 'Quotation Requested'
  | 'Cancelled';

export interface CalculatedProductLine {
  productId: string;
  sku: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  quantity: number;
  requiresQuotation: boolean;
  appliedTierMinQty: number;
  baseUnitRate: number;
  inclGstUnitRate: number;
  lineBaseTotal: number;
  lineGstAmount: number;
  lineTotalInclGst: number;
  mrpSavings: number;
}

export interface CalculatedComboLine {
  comboId: string;
  code: string;
  name: string;
  quantity: number;
  expanderProductId: string;
  expanderQtyPerCombo: number;
  forcepsProductId: string;
  forcepsQtyPerCombo: number;
  unitPriceInclGst: number;
  lineTotalInclGst: number;
  standaloneEquivalentTotal: number;
  comboSavings: number;
}

export interface ComboSuggestion {
  comboId: string;
  comboName: string;
  comboCount: number;
  expanderProductId: string;
  expanderName: string;
  forcepsProductId: string;
  remainingExpanderQty: number;
  remainingForcepsQty: number;
  currentCombinedTotal: number;
  suggestedCombinedTotal: number;
  savingsAmount: number;
  description: string;
}

export interface PricingBreakdown {
  productLines: CalculatedProductLine[];
  comboLines: CalculatedComboLine[];
  quotationProducts: CalculatedProductLine[];
  hasQuotationItems: boolean;
  totalUnitsExpanders: number;
  totalUnitsForceps: number;
  subtotalBase: number;
  totalGstAmount: number;
  grandTotalInclGst: number;
  totalMrpValue: number;
  totalSavingsVsMrp: number;
  shippingFee: number;
  comboSuggestion: ComboSuggestion | null;
}

export interface OrderItemRecord {
  itemType: 'product' | 'combo' | 'quotation';
  refId: string;
  name: string;
  quantity: number;
  appliedTierMinQty?: number;
  unitRateInclGst: number;
  lineTotalInclGst: number;
  meta?: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  customer: CustomerFormInput;
  items: OrderItemRecord[];
  subtotalBase: number;
  gstAmount: number;
  shippingFee: number;
  grandTotalInclGst: number;
  hasQuotationItems: boolean;
  whatsappMessage: string;
  adminNotes: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  previousStock: number;
  newStock: number;
  reason: string;
  actor: string;
  createdAt: string;
}
