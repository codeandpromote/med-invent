import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderBreakdown,
  calculateProductLine,
  findBestComboSuggestion,
  buildWhatsAppMessage,
} from './pricing';
import { validateCustomerForm, sanitizeCustomerInput } from './validation';
import type { ComboPack, CustomerFormInput, Product, SiteSettings } from './types';

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'b-hex',
    sku: 'MID-BHEX-01',
    name: 'B-HEX® Pupil Expander',
    shortName: 'B-HEX®',
    category: 'expander',
    mrp: 2995,
    expiryNote: 'Exp 3 Yrs',
    gstRatePct: 5,
    description: 'Globally patented hexagonal pupil expander.',
    accentTheme: 'blue',
    imageKey: 'expander',
    maxOnlineQty: 20,
    stockQty: 120,
    reorderLevel: 25,
    isActive: true,
    tiers: [
      { minQty: 1, baseRate: 1800, inclGstRate: 1890 },
      { minQty: 5, baseRate: 1500, inclGstRate: 1575 },
      { minQty: 10, baseRate: 1450, inclGstRate: 1522.5 },
      { minQty: 20, baseRate: 1400, inclGstRate: 1470 },
    ],
  },
  {
    id: 'b-hex-2',
    sku: 'MID-BHEX-02',
    name: 'B-HEX® Pupil Expander 2.0',
    shortName: 'B-HEX® 2.0',
    category: 'expander',
    mrp: 3555,
    expiryNote: 'Exp 3 Yrs',
    gstRatePct: 5,
    description: 'Next-gen B-HEX 2.0 pupil expander.',
    accentTheme: 'lime',
    imageKey: 'expander',
    maxOnlineQty: 20,
    stockQty: 95,
    reorderLevel: 20,
    isActive: true,
    tiers: [
      { minQty: 1, baseRate: 2000, inclGstRate: 2100 },
      { minQty: 5, baseRate: 1700, inclGstRate: 1785 },
      { minQty: 10, baseRate: 1650, inclGstRate: 1732.5 },
      { minQty: 20, baseRate: 1600, inclGstRate: 1680 },
    ],
  },
  {
    id: 'b-hex-forceps',
    sku: 'MID-FORCEPS-23G',
    name: 'B-HEX® 23G Forceps',
    shortName: '23G Forceps',
    category: 'forceps',
    mrp: 14000,
    expiryNote: 'Reusable',
    gstRatePct: 12,
    description: 'Genuine B-HEX 23G Forceps.',
    accentTheme: 'crimson',
    imageKey: 'forceps',
    maxOnlineQty: 20,
    stockQty: 40,
    reorderLevel: 10,
    isActive: true,
    tiers: [{ minQty: 1, baseRate: 5892.86, inclGstRate: 6600 }],
  },
];

const SAMPLE_COMBOS: ComboPack[] = [
  {
    id: 'combo-bhex-2',
    code: 'CMB-BHEX-2',
    name: 'COMBO: 2 B-HEX® + 1 Forceps',
    expanderProductId: 'b-hex',
    expanderQty: 2,
    forcepsProductId: 'b-hex-forceps',
    forcepsQty: 1,
    comboPriceInclGst: 9449,
    mrpTotal: 19990,
    accentTheme: 'blue',
    isActive: true,
  },
  {
    id: 'combo-bhex-5',
    code: 'CMB-BHEX-5',
    name: 'COMBO: 5 B-HEX® + 1 Forceps',
    expanderProductId: 'b-hex',
    expanderQty: 5,
    forcepsProductId: 'b-hex-forceps',
    forcepsQty: 1,
    comboPriceInclGst: 14099,
    mrpTotal: 28975,
    accentTheme: 'blue',
    isActive: true,
  },
  {
    id: 'combo-bhex-10',
    code: 'CMB-BHEX-10',
    name: 'COMBO: 10 B-HEX® + 1 Forceps',
    expanderProductId: 'b-hex',
    expanderQty: 10,
    forcepsProductId: 'b-hex-forceps',
    forcepsQty: 1,
    comboPriceInclGst: 21825,
    mrpTotal: 43950,
    accentTheme: 'blue',
    isActive: true,
  },
];

const SAMPLE_SETTINGS: SiteSettings = {
  companyName: 'Med Invent Devices Pvt Ltd',
  websiteUrl: 'https://www.medinventdevices.com/corporate/index2.php',
  whatsappNumber: '919051112020',
  displayPhone: '+91 90511 12020',
  supportEmail: 'info@medinventdevices.com',
  promoBannerText: 'Free Shipping across India · All prices inclusive of GST',
  deliveryCoverageNote: 'Applicable only within India.',
  distributorDisclaimer: 'Distributors CANNOT supply COMBO offers.',
  patentFooterNote: 'B-HEX® Pupil Expander is globally Patented by Med Invent Devices',
  terms: ['Term 1'],
  portalPasscodeEnabled: false,
  portalPasscode: 'MEDINVENT',
};

test('applies lower pack tier rate for intermediate quantities (7 pcs B-HEX = Rs 11025)', () => {
  const bhex = SAMPLE_PRODUCTS[0];
  const line7 = calculateProductLine(bhex, 7);
  assert.ok(line7);
  assert.equal(line7.appliedTierMinQty, 5);
  assert.equal(line7.inclGstUnitRate, 1575);
  assert.equal(line7.lineTotalInclGst, 11025);
});

test('flags quantities above 20 as quotation required', () => {
  const bhex = SAMPLE_PRODUCTS[0];
  const line25 = calculateProductLine(bhex, 25);
  assert.ok(line25);
  assert.equal(line25.requiresQuotation, true);
  assert.equal(line25.lineTotalInclGst, 0);
});

test('prices combos independently of additional expanders (5-pc combo 14099 + 5 B-HEX 7875 = 21974)', () => {
  const breakdown = calculateOrderBreakdown(
    SAMPLE_PRODUCTS,
    SAMPLE_COMBOS,
    { 'b-hex': 5 },
    { 'combo-bhex-5': 1 }
  );
  assert.equal(breakdown.grandTotalInclGst, 21974);
  assert.equal(breakdown.totalUnitsExpanders, 10);
  assert.equal(breakdown.totalUnitsForceps, 1);
});

test('supports repeat identical combos in one order', () => {
  const breakdown = calculateOrderBreakdown(
    SAMPLE_PRODUCTS,
    SAMPLE_COMBOS,
    {},
    { 'combo-bhex-5': 2 }
  );
  assert.equal(breakdown.grandTotalInclGst, 28198);
  assert.equal(breakdown.totalUnitsExpanders, 10);
  assert.equal(breakdown.totalUnitsForceps, 2);
});

test('suggests cheaper published combo when standalone expanders + forceps qualify', () => {
  // 2 B-HEX (3780) + 1 Forceps (6600) = 10380 vs Combo (9449) -> saves 931
  const suggestion2 = findBestComboSuggestion(SAMPLE_PRODUCTS, SAMPLE_COMBOS, {
    'b-hex': 2,
    'b-hex-forceps': 1,
  });
  assert.ok(suggestion2);
  assert.equal(suggestion2.comboId, 'combo-bhex-2');
  assert.equal(suggestion2.savingsAmount, 931);

  // 5 B-HEX (7875) + 1 Forceps (6600) = 14475 vs Combo (14099) -> saves 376
  const suggestion5 = findBestComboSuggestion(SAMPLE_PRODUCTS, SAMPLE_COMBOS, {
    'b-hex': 5,
    'b-hex-forceps': 1,
  });
  assert.ok(suggestion5);
  assert.equal(suggestion5.comboId, 'combo-bhex-5');
  assert.equal(suggestion5.savingsAmount, 376);
});

test('validates compulsory Indian customer details and optional GSTIN', () => {
  const invalid: CustomerFormInput = {
    orderingName: '',
    orderingMobile: '12345',
    billingAddress: 'short',
    deliveryAddress: '',
    pinCode: '012345',
    receivingName: '',
    receivingMobile: 'abc',
    hospitalName: '',
    email: 'bad-email',
    gstin: 'INVALIDGST',
    notes: '',
  };
  const errors = validateCustomerForm(invalid);
  assert.ok(errors.orderingName);
  assert.ok(errors.orderingMobile);
  assert.ok(errors.billingAddress);
  assert.ok(errors.deliveryAddress);
  assert.ok(errors.pinCode);
  assert.ok(errors.receivingName);
  assert.ok(errors.receivingMobile);
  assert.ok(errors.email);
  assert.ok(errors.gstin);

  const valid: CustomerFormInput = {
    orderingName: 'Dr. Anirban Sen',
    orderingMobile: '+91 98300 12345',
    billingAddress: '14 Shakespeare Sarani, Kolkata, WB',
    deliveryAddress: '14 Shakespeare Sarani, Kolkata, WB',
    pinCode: '700071',
    receivingName: 'Sister Priya Das',
    receivingMobile: '9830098765',
    hospitalName: 'Netra Eye Clinic',
    email: 'sen@netraeye.in',
    gstin: '19AABCU9603R1ZM',
    notes: 'Deliver before 5pm',
  };
  const noErrors = validateCustomerForm(valid);
  assert.deepEqual(noErrors, {});
  const sanitized = sanitizeCustomerInput(valid);
  assert.equal(sanitized.orderingMobile, '9830012345');
});

test('builds itemized WhatsApp message with order ref and total', () => {
  const breakdown = calculateOrderBreakdown(
    SAMPLE_PRODUCTS,
    SAMPLE_COMBOS,
    { 'b-hex': 7 },
    { 'combo-bhex-2': 1 }
  );
  const msg = buildWhatsAppMessage({
    orderNumber: 'MID-2026-1001',
    breakdown,
    customer: {
      orderingName: 'Dr. Meera Nair',
      orderingMobile: '9845011223',
      billingAddress: 'MG Road, Bengaluru',
      deliveryAddress: 'MG Road, Bengaluru',
      pinCode: '560001',
      receivingName: 'Dr. Meera Nair',
      receivingMobile: '9845011223',
      hospitalName: 'Vision Care',
      email: '',
      gstin: '',
      notes: '',
    },
    settings: SAMPLE_SETTINGS,
  });
  assert.match(msg, /MID-2026-1001/);
  assert.match(msg, /11,025/);
  assert.match(msg, /9,449/);
  assert.match(msg, /20,474/);
});
