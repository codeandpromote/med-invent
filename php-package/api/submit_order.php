<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/validation.php';
require_once __DIR__ . '/../includes/pricing_engine.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '{}', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

if (!verify_csrf($payload['csrfToken'] ?? null)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid security token. Please refresh the page.']);
    exit;
}

$validation = validate_customer_input($payload['customer'] ?? []);
if (!empty($validation['errors'])) {
    http_response_code(422);
    echo json_encode(['error' => 'Validation failed', 'fieldErrors' => $validation['errors']]);
    exit;
}

$clean = $validation['clean'];
$productQuantities = is_array($payload['productQuantities'] ?? null) ? $payload['productQuantities'] : [];
$comboQuantities = is_array($payload['comboQuantities'] ?? null) ? $payload['comboQuantities'] : [];

try {
    $pdo = db();
    $settings = get_site_settings($pdo);
    $catalog = load_active_catalog($pdo);
    $calc = calculate_server_order($catalog['products'], $catalog['combos'], $productQuantities, $comboQuantities);

    if (empty($calc['items'])) {
        http_response_code(422);
        echo json_encode(['error' => 'Please select at least one product or combo pack.']);
        exit;
    }

    $pdo->beginTransaction();

    // Verify & deduct stock atomically for confirmed catalog items
    foreach ($calc['stock_needed'] as $productId => $qtyNeeded) {
        $stmt = $pdo->prepare('SELECT id, name, stock_qty FROM medinvent_products WHERE id = ? FOR UPDATE');
        $stmt->execute([$productId]);
        $row = $stmt->fetch();
        if (!$row) {
            $pdo->rollBack();
            http_response_code(404);
            echo json_encode(['error' => 'Product not found: ' . $productId]);
            exit;
        }
        $prevStock = (int)$row['stock_qty'];
        $newStock = max(0, $prevStock - (int)$qtyNeeded);

        $upd = $pdo->prepare('UPDATE medinvent_products SET stock_qty = ? WHERE id = ?');
        $upd->execute([$newStock, $productId]);
    }

    $orderNumber = 'MID-' . date('Y') . '-' . random_int(1000, 9999);
    $status = $calc['has_quotation'] && $calc['grand_total'] <= 0 ? 'Quotation Requested' : 'Pending WhatsApp';
    $waText = build_whatsapp_order_text($orderNumber, $calc, $clean, $settings);

    $insertOrder = $pdo->prepare(
        'INSERT INTO medinvent_orders (
            order_number, status, ordering_name, ordering_mobile, billing_address,
            delivery_address, pin_code, receiving_name, receiving_mobile,
            hospital_name, email, gstin, customer_notes,
            subtotal_base, gst_amount, shipping_fee, grand_total_incl_gst,
            has_quotation_items, whatsapp_message, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, ?)'
    );

    $insertOrder->execute([
        $orderNumber,
        $status,
        $clean['ordering_name'],
        $clean['ordering_mobile'],
        $clean['billing_address'],
        $clean['delivery_address'],
        $clean['pin_code'],
        $clean['receiving_name'],
        $clean['receiving_mobile'],
        $clean['hospital_name'] ?: null,
        $clean['email'] ?: null,
        $clean['gstin'] ?: null,
        $clean['notes'] ?: null,
        $calc['subtotal_base'],
        $calc['gst_amount'],
        $calc['grand_total'],
        $calc['has_quotation'] ? 1 : 0,
        $waText,
        $_SERVER['REMOTE_ADDR'] ?? null,
    ]);

    $orderId = (int)$pdo->lastInsertId();

    $insertItem = $pdo->prepare(
        'INSERT INTO medinvent_order_items (
            order_id, item_type, ref_id, item_name, quantity,
            applied_tier_min_qty, unit_rate_incl_gst, line_total_incl_gst
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($calc['items'] as $item) {
        $insertItem->execute([
            $orderId,
            $item['item_type'],
            $item['ref_id'],
            $item['item_name'],
            $item['quantity'],
            $item['applied_tier_min_qty'],
            $item['unit_rate_incl_gst'],
            $item['line_total_incl_gst'],
        ]);
    }

    // Write inventory audit logs
    $logStmt = $pdo->prepare(
        'INSERT INTO medinvent_inventory_logs (product_id, delta, previous_stock, new_stock, reason, actor)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    foreach ($calc['stock_needed'] as $productId => $qtyNeeded) {
        $curr = $pdo->prepare('SELECT stock_qty FROM medinvent_products WHERE id = ?');
        $curr->execute([$productId]);
        $newStock = (int)$curr->fetchColumn();
        $prevStock = $newStock + (int)$qtyNeeded;
        $logStmt->execute([
            $productId,
            -(int)$qtyNeeded,
            $prevStock,
            $newStock,
            'Order ' . $orderNumber,
            'Customer Portal',
        ]);
    }

    $pdo->commit();

    $waDigits = preg_replace('/\D+/', '', $settings['whatsapp_number']);
    if (strlen($waDigits) === 10) {
        $waDigits = '91' . $waDigits;
    }

    echo json_encode([
        'ok'              => true,
        'orderNumber'     => $orderNumber,
        'grandTotal'      => $calc['grand_total'],
        'whatsappMessage' => $waText,
        'whatsappUrl'     => 'https://wa.me/' . $waDigits . '?text=' . rawurlencode($waText),
    ]);
} catch (Throwable $ex) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Could not save order request. Please try again.']);
}
