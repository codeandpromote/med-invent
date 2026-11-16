import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { mutateStore } from '@/lib/db';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  calculateOrderBreakdown,
} from '@/lib/pricing';
import { sanitizeCustomerInput, validateCustomerForm } from '@/lib/validation';
import { PORTAL_COOKIE_NAME, verifyPortalAccessToken } from '@/lib/auth';
import type { CustomerFormInput, OrderItemRecord, OrderRecord } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      customer?: CustomerFormInput;
      productQuantities?: Record<string, number>;
      comboQuantities?: Record<string, number>;
    };

    if (!body.customer) {
      return NextResponse.json({ error: 'Customer details are required.' }, { status: 400 });
    }

    const fieldErrors = validateCustomerForm(body.customer);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { error: 'Please complete all compulsory customer fields accurately.', fieldErrors },
        { status: 422 }
      );
    }

    const cleanCustomer = sanitizeCustomerInput(body.customer);
    const productQuantities = body.productQuantities ?? {};
    const comboQuantities = body.comboQuantities ?? {};

    const cookieStore = await cookies();
    const portalCookie = cookieStore.get(PORTAL_COOKIE_NAME)?.value;

    const result = await mutateStore((draft) => {
      if (
        draft.settings.portalPasscodeEnabled &&
        !verifyPortalAccessToken(portalCookie, draft.settings.portalPasscode)
      ) {
        return { status: 403 as const, error: 'Portal access verification required.' };
      }

      const breakdown = calculateOrderBreakdown(
        draft.products,
        draft.combos,
        productQuantities,
        comboQuantities
      );

      if (
        breakdown.productLines.length === 0 &&
        breakdown.comboLines.length === 0 &&
        breakdown.quotationProducts.length === 0
      ) {
        return {
          status: 422 as const,
          error: 'Please select at least one pupil expander, forceps, or combo pack.',
        };
      }

      // Compute total units needed per product for stock tracking
      const neededByProduct = new Map<string, number>();
      for (const line of breakdown.productLines) {
        neededByProduct.set(
          line.productId,
          (neededByProduct.get(line.productId) ?? 0) + line.quantity
        );
      }
      for (const cLine of breakdown.comboLines) {
        neededByProduct.set(
          cLine.expanderProductId,
          (neededByProduct.get(cLine.expanderProductId) ?? 0) +
            cLine.quantity * cLine.expanderQtyPerCombo
        );
        neededByProduct.set(
          cLine.forcepsProductId,
          (neededByProduct.get(cLine.forcepsProductId) ?? 0) +
            cLine.quantity * cLine.forcepsQtyPerCombo
        );
      }

      const orderNumber = `MID-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      // Deduct inventory and create inventory audit logs
      for (const [productId, qtyUsed] of neededByProduct.entries()) {
        const prod = draft.products.find((p) => p.id === productId);
        if (!prod) continue;
        const previousStock = prod.stockQty;
        const newStock = Math.max(0, previousStock - qtyUsed);
        prod.stockQty = newStock;
        draft.inventoryLogs.unshift({
          id: `log-${crypto.randomUUID().slice(0, 8)}`,
          productId: prod.id,
          productName: prod.name,
          delta: -qtyUsed,
          previousStock,
          newStock,
          reason: `Order Request ${orderNumber}`,
          actor: 'Customer Portal',
          createdAt: now,
        });
      }

      const items: OrderItemRecord[] = [
        ...breakdown.productLines.map((l) => ({
          itemType: 'product' as const,
          refId: l.productId,
          name: l.name,
          quantity: l.quantity,
          appliedTierMinQty: l.appliedTierMinQty,
          unitRateInclGst: l.inclGstUnitRate,
          lineTotalInclGst: l.lineTotalInclGst,
        })),
        ...breakdown.comboLines.map((c) => ({
          itemType: 'combo' as const,
          refId: c.comboId,
          name: c.name,
          quantity: c.quantity,
          unitRateInclGst: c.unitPriceInclGst,
          lineTotalInclGst: c.lineTotalInclGst,
          meta: `${c.expanderQtyPerCombo} Expanders + ${c.forcepsQtyPerCombo} Forceps per pack`,
        })),
        ...breakdown.quotationProducts.map((q) => ({
          itemType: 'quotation' as const,
          refId: q.productId,
          name: q.name,
          quantity: q.quantity,
          unitRateInclGst: 0,
          lineTotalInclGst: 0,
          meta: 'Bulk >20 pcs quotation requested',
        })),
      ];

      const whatsappMessage = buildWhatsAppMessage({
        orderNumber,
        breakdown,
        customer: cleanCustomer,
        settings: draft.settings,
      });

      const orderStatus =
        breakdown.hasQuotationItems && breakdown.grandTotalInclGst === 0
          ? 'Quotation Requested'
          : 'Pending WhatsApp';

      const order: OrderRecord = {
        id: `ord-${crypto.randomUUID().slice(0, 8)}`,
        orderNumber,
        createdAt: now,
        updatedAt: now,
        status: orderStatus,
        customer: cleanCustomer,
        items,
        subtotalBase: breakdown.subtotalBase,
        gstAmount: breakdown.totalGstAmount,
        shippingFee: 0,
        grandTotalInclGst: breakdown.grandTotalInclGst,
        hasQuotationItems: breakdown.hasQuotationItems,
        whatsappMessage,
        adminNotes: '',
      };

      draft.orders.unshift(order);

      const whatsappUrl = buildWhatsAppUrl(
        draft.settings.whatsappNumber,
        whatsappMessage
      );

      return { status: 201 as const, order, whatsappUrl };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        ok: true,
        order: result.order,
        whatsappUrl: result.whatsappUrl,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Unable to submit order request right now.' },
      { status: 500 }
    );
  }
}
