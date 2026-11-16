<?php
declare(strict_types=1);

function load_active_catalog(PDO $pdo): array
{
    $products = $pdo->query(
        'SELECT * FROM medinvent_products WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    )->fetchAll();

    $tierRows = $pdo->query(
        'SELECT * FROM medinvent_product_tiers ORDER BY min_qty ASC'
    )->fetchAll();

    $tiersByProduct = [];
    foreach ($tierRows as $tr) {
        $tiersByProduct[$tr['product_id']][] = [
            'min_qty'       => (int)$tr['min_qty'],
            'base_rate'     => (float)$tr['base_rate'],
            'incl_gst_rate' => (float)$tr['incl_gst_rate'],
            'pack_label'    => $tr['pack_label'],
        ];
    }

    foreach ($products as &$p) {
        $p['tiers'] = $tiersByProduct[$p['id']] ?? [];
    }
    unset($p);

    $combos = $pdo->query(
        'SELECT * FROM medinvent_combos WHERE is_active = 1 ORDER BY expander_qty ASC, id ASC'
    )->fetchAll();

    return ['products' => $products, 'combos' => $combos];
}

function resolve_applicable_tier(array $tiers, int $qty): array
{
    $applicable = $tiers[0];
    foreach ($tiers as $tier) {
        if ($qty >= $tier['min_qty']) {
            $applicable = $tier;
        } else {
            break;
        }
    }
    return $applicable;
}

function calculate_server_order(array $products, array $combos, array $productQtyMap, array $comboQtyMap): array
{
    $productsById = [];
    foreach ($products as $p) {
        $productsById[$p['id']] = $p;
    }

    $items = [];
    $stockNeeded = [];
    $subtotalBase = 0.0;
    $gstAmount = 0.0;
    $grandTotal = 0.0;
    $hasQuotation = false;

    foreach ($products as $p) {
        $qty = max(0, (int)($productQtyMap[$p['id']] ?? 0));
        if ($qty <= 0 || empty($p['tiers'])) {
            continue;
        }

        $maxOnline = (int)$p['max_online_qty'];
        if ($maxOnline > 0 && $qty > $maxOnline) {
            $hasQuotation = true;
            $items[] = [
                'item_type'           => 'quotation',
                'ref_id'              => $p['id'],
                'item_name'           => $p['name'],
                'quantity'            => $qty,
                'applied_tier_min_qty'=> null,
                'unit_rate_incl_gst'  => 0.0,
                'line_total_incl_gst' => 0.0,
            ];
            continue;
        }

        $tier = resolve_applicable_tier($p['tiers'], $qty);
        $lineTotal = round($tier['incl_gst_rate'] * $qty, 2);
        $lineBase = round($tier['base_rate'] * $qty, 2);
        $lineGst = round($lineTotal - $lineBase, 2);

        $subtotalBase += $lineBase;
        $gstAmount += $lineGst;
        $grandTotal += $lineTotal;

        $stockNeeded[$p['id']] = ($stockNeeded[$p['id']] ?? 0) + $qty;

        $items[] = [
            'item_type'            => 'product',
            'ref_id'               => $p['id'],
            'item_name'            => $p['name'],
            'quantity'             => $qty,
            'applied_tier_min_qty' => $tier['min_qty'],
            'unit_rate_incl_gst'   => $tier['incl_gst_rate'],
            'line_total_incl_gst'  => $lineTotal,
        ];
    }

    foreach ($combos as $c) {
        $qty = max(0, (int)($comboQtyMap[$c['id']] ?? 0));
        if ($qty <= 0) {
            continue;
        }
        $unitPrice = (float)$c['combo_price_incl_gst'];
        $lineTotal = round($unitPrice * $qty, 2);
        $expProd = $productsById[$c['expander_product_id']] ?? null;
        $gstPct = $expProd ? (float)$expProd['gst_rate_pct'] : 5.0;
        $lineBase = round($lineTotal / (1 + $gstPct / 100), 2);
        $lineGst = round($lineTotal - $lineBase, 2);

        $subtotalBase += $lineBase;
        $gstAmount += $lineGst;
        $grandTotal += $lineTotal;

        $expNeed = $qty * (int)$c['expander_qty'];
        $frcNeed = $qty * (int)$c['forceps_qty'];
        $stockNeeded[$c['expander_product_id']] = ($stockNeeded[$c['expander_product_id']] ?? 0) + $expNeed;
        $stockNeeded[$c['forceps_product_id']] = ($stockNeeded[$c['forceps_product_id']] ?? 0) + $frcNeed;

        $items[] = [
            'item_type'            => 'combo',
            'ref_id'               => $c['id'],
            'item_name'            => $c['name'],
            'quantity'             => $qty,
            'applied_tier_min_qty' => null,
            'unit_rate_incl_gst'   => $unitPrice,
            'line_total_incl_gst'  => $lineTotal,
        ];
    }

    return [
        'items'         => $items,
        'stock_needed'  => $stockNeeded,
        'subtotal_base' => round($subtotalBase, 2),
        'gst_amount'    => round($gstAmount, 2),
        'grand_total'   => round($grandTotal, 2),
        'has_quotation' => $hasQuotation,
    ];
}

function format_inr_php(float $amount): string
{
    $decimals = abs($amount - round($amount)) > 0.001 ? 2 : 0;
    return '₹' . number_format($amount, $decimals, '.', ',');
}

function build_whatsapp_order_text(string $orderNumber, array $calc, array $cleanCustomer, array $settings): string
{
    $lines = [];
    $lines[] = '*ORDER REQUEST — ' . $settings['company_name'] . '*';
    $lines[] = 'Ref: ' . $orderNumber;
    $lines[] = '--------------------------------';
    $lines[] = '*ITEMS SELECTED:*';

    foreach ($calc['items'] as $it) {
        if ($it['item_type'] === 'product') {
            $lines[] = sprintf(
                '• %s × %d pc(s) [Pack %d+ rate @ %s/pc] = *%s*',
                $it['item_name'],
                $it['quantity'],
                $it['applied_tier_min_qty'],
                format_inr_php((float)$it['unit_rate_incl_gst']),
                format_inr_php((float)$it['line_total_incl_gst'])
            );
        } elseif ($it['item_type'] === 'combo') {
            $lines[] = sprintf(
                '• %s × %d pack(s) @ %s = *%s*',
                $it['item_name'],
                $it['quantity'],
                format_inr_php((float)$it['unit_rate_incl_gst']),
                format_inr_php((float)$it['line_total_incl_gst'])
            );
        }
    }

    if ($calc['has_quotation']) {
        $lines[] = '';
        $lines[] = '*BULK QUOTATION REQUESTED (>20 pcs):*';
        foreach ($calc['items'] as $it) {
            if ($it['item_type'] === 'quotation') {
                $lines[] = sprintf('• %s × %d pcs — Contact for quotation', $it['item_name'], $it['quantity']);
            }
        }
    }

    $lines[] = '--------------------------------';
    if ($calc['grand_total'] > 0) {
        $lines[] = '*TOTAL PAYABLE (Incl. GST & Free Shipping): ' . format_inr_php($calc['grand_total']) . '*';
        $lines[] = '(Includes GST ~' . format_inr_php($calc['gst_amount']) . ' · Free India Delivery)';
    }
    $lines[] = '';
    $lines[] = '*CUSTOMER & DELIVERY DETAILS (INDIA):*';
    $lines[] = 'Ordering Person: ' . $cleanCustomer['ordering_name'];
    $lines[] = 'Ordering Mobile: ' . $cleanCustomer['ordering_mobile'];
    $lines[] = 'Receiving Person: ' . $cleanCustomer['receiving_name'];
    $lines[] = 'Receiving Mobile: ' . $cleanCustomer['receiving_mobile'];
    if ($cleanCustomer['hospital_name'] !== '') {
        $lines[] = 'Hospital / Clinic: ' . $cleanCustomer['hospital_name'];
    }
    $lines[] = 'Billing Address: ' . $cleanCustomer['billing_address'];
    $lines[] = 'Delivery Address: ' . $cleanCustomer['delivery_address'];
    $lines[] = 'PIN Code: ' . $cleanCustomer['pin_code'];
    if ($cleanCustomer['email'] !== '') {
        $lines[] = 'Email: ' . $cleanCustomer['email'];
    }
    if ($cleanCustomer['gstin'] !== '') {
        $lines[] = 'GSTIN: ' . $cleanCustomer['gstin'];
    }
    if ($cleanCustomer['notes'] !== '') {
        $lines[] = 'Order Note: ' . $cleanCustomer['notes'];
    }
    $lines[] = '--------------------------------';
    $lines[] = 'Please confirm stock availability, INR payment details, and dispatch timeline.';

    return implode("\n", $lines);
}
