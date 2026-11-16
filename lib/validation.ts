import type { CustomerFormInput } from './types';

export type CustomerFormErrors = Partial<Record<keyof CustomerFormInput, string>>;

export function normalizeIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export function isValidIndianMobile(raw: string): boolean {
  const normalized = normalizeIndianMobile(raw);
  return /^[6-9]\d{9}$/.test(normalized);
}

export function isValidIndianPinCode(raw: string): boolean {
  const trimmed = raw.trim();
  return /^[1-9]\d{5}$/.test(trimmed);
}

export function isValidGSTIN(raw: string): boolean {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) return true; // Optional
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(normalized);
}

export function isValidOptionalEmail(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true; // Optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateCustomerForm(input: CustomerFormInput): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  if (!input.orderingName.trim() || input.orderingName.trim().length < 2) {
    errors.orderingName = 'Please enter the full name of the person ordering.';
  }

  if (!isValidIndianMobile(input.orderingMobile)) {
    errors.orderingMobile = 'Enter a valid 10-digit Indian mobile number.';
  }

  if (!input.billingAddress.trim() || input.billingAddress.trim().length < 8) {
    errors.billingAddress = 'Enter a complete billing address in India.';
  }

  if (!input.deliveryAddress.trim() || input.deliveryAddress.trim().length < 8) {
    errors.deliveryAddress = 'Enter a complete delivery address in India.';
  }

  if (!isValidIndianPinCode(input.pinCode)) {
    errors.pinCode = 'Enter a valid 6-digit Indian PIN code.';
  }

  if (!input.receivingName.trim() || input.receivingName.trim().length < 2) {
    errors.receivingName = 'Please enter the name of the person receiving delivery.';
  }

  if (!isValidIndianMobile(input.receivingMobile)) {
    errors.receivingMobile = 'Enter a valid 10-digit Indian mobile number for receiver.';
  }

  if (!isValidOptionalEmail(input.email)) {
    errors.email = 'Enter a valid email address or leave blank.';
  }

  if (!isValidGSTIN(input.gstin)) {
    errors.gstin = 'Enter a valid 15-character GSTIN (e.g., 27AAPFU0939F1ZV) or leave blank.';
  }

  return errors;
}

export function sanitizeCustomerInput(input: CustomerFormInput): CustomerFormInput {
  return {
    orderingName: input.orderingName.trim(),
    orderingMobile: normalizeIndianMobile(input.orderingMobile),
    billingAddress: input.billingAddress.trim(),
    deliveryAddress: input.deliveryAddress.trim(),
    pinCode: input.pinCode.trim(),
    receivingName: input.receivingName.trim(),
    receivingMobile: normalizeIndianMobile(input.receivingMobile),
    hospitalName: input.hospitalName.trim(),
    email: input.email.trim(),
    gstin: input.gstin.trim().toUpperCase(),
    notes: input.notes.trim(),
  };
}
