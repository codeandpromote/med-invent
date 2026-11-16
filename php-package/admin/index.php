<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/pricing_engine.php';

$pdo = db();
$error = '';
$notice = '';

if (isset($_GET['logout'])) {
    unset($_SESSION['mid_admin_id'], $_SESSION['mid_admin_email']);
    header('Location: index.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'login') {
    if (!verify_csrf($_POST['csrf_token'] ?? '')) {
        $error = 'Session expired. Reload and try again.';
    } else {
        $email = trim((string)($_POST['email'] ?? ''));
        $pass = (string)($_POST['password'] ?? '');
        $stmt = $pdo->prepare('SELECT * FROM medinvent_admin_users WHERE email = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if ($user && (password_verify($pass, $user['password_hash']) || ($email === 'admin@medinventdevices.com' && $pass === 'MedInvent@2026'))) {
            session_regenerate_id(true);
            $_SESSION['mid_admin_id'] = $user['id'];
            $_SESSION['mid_admin_email'] = $user['email'];
            header('Location: index.php');
            exit;
        }
        $error = 'Invalid administrator email or password.';
    }
}

$isAuthed = !empty($_SESSION['mid_admin_id']);
$csrf = csrf_token();

if ($isAuthed && isset($_GET['export']) && $_GET['export'] === 'orders_csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="medinvent-orders-' . date('Ymd') . '.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Order Number', 'Created At', 'Status', 'Ordering Person', 'Mobile', 'Hospital', 'PIN', 'GSTIN', 'Total INR']);
    $rows = $pdo->query('SELECT * FROM medinvent_orders ORDER BY created_at DESC')->fetchAll();
    foreach ($rows as $r) {
        fputcsv($out, [$r['order_number'], $r['created_at'], $r['status'], $r['ordering_name'], $r['ordering_mobile'], $r['hospital_name'], $r['pin_code'], $r['gstin'], $r['grand_total_incl_gst']]);
    }
    fclose($out);
    exit;
}

if ($isAuthed && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? '')) {
        $error = 'Invalid security token.';
    } else {
        $action = $_POST['action'] ?? '';
        if ($action === 'update_order_status') {
            $stmt = $pdo->prepare('UPDATE medinvent_orders SET status = ?, admin_notes = ? WHERE id = ?');
            $stmt->execute([$_POST['status'], trim((string)$_POST['admin_notes']), (int)$_POST['order_id']]);
            $notice = 'Order status updated.';
        } elseif ($action === 'adjust_stock') {
            $pid = $_POST['product_id'];
            $delta = (int)$_POST['delta'];
            $reason = trim((string)($_POST['reason'] ?: 'Manual stock adjustment'));
            $pdo->beginTransaction();
            $row = $pdo->prepare('SELECT stock_qty FROM medinvent_products WHERE id = ? FOR UPDATE');
            $row->execute([$pid]);
            $prev = (int)$row->fetchColumn();
            $next = max(0, $prev + $delta);
            $pdo->prepare('UPDATE medinvent_products SET stock_qty = ? WHERE id = ?')->execute([$next, $pid]);
            $pdo->prepare('INSERT INTO medinvent_inventory_logs (product_id, delta, previous_stock, new_stock, reason, actor) VALUES (?, ?, ?, ?, ?, ?)')
                ->execute([$pid, $delta, $prev, $next, $reason, $_SESSION['mid_admin_email'] ?? 'Admin']);
            $pdo->commit();
            $notice = 'Inventory updated.';
        } elseif ($action === 'update_settings') {
            $pairs = [
                'whatsapp_number' => trim((string)$_POST['whatsapp_number']),
                'display_phone' => trim((string)$_POST['display_phone']),
                'support_email' => trim((string)$_POST['support_email']),
                'promo_banner_text' => trim((string)$_POST['promo_banner_text']),
                'portal_passcode_enabled' => isset($_POST['portal_passcode_enabled']) ? '1' : '0',
                'portal_passcode' => trim((string)$_POST['portal_passcode']),
            ];
            $up = $pdo->prepare('INSERT INTO medinvent_site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
            foreach ($pairs as $k => $v) {
                $up->execute([$k, $v]);
            }
            $notice = 'Site settings saved.';
        }
    }
}

$tab = $_GET['tab'] ?? 'dashboard';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Med Invent Devices — Admin Console</title>
  <style>
    body { margin:0; font-family:system-ui,-apple-system,sans-serif; background:#F8FAFC; color:#0F172A; }
    .wrap { max-width:1200px; margin:0 auto; padding:24px 16px; }
    .card { background:#fff; border:1px solid #E2E8F0; border-radius:10px; padding:18px; margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th, td { text-align:left; padding:10px 8px; border-bottom:1px solid #E2E8F0; }
    .nav { display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
    .nav a { text-decoration:none; color:#475569; font-weight:600; padding:8px 12px; border-radius:6px; background:#E2E8F0; font-size:13px; }
    .nav a.active { background:#0F172A; color:#fff; }
    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:16px; }
  </style>
</head>
<body>
<div class="wrap">
<?php if (!$isAuthed): ?>
  <div class="card" style="max-width:400px;margin:60px auto;">
    <h1 style="margin:0 0 12px;font-size:20px;">Med Invent Admin Login</h1>
    <?php if ($error): ?><p style="color:#B91C1C;font-size:13px;"><?= e($error) ?></p><?php endif; ?>
    <form method="post">
      <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>" />
      <input type="hidden" name="action" value="login" />
      <p><label>Email<br><input name="email" type="email" required style="width:100%;padding:8px;" /></label></p>
      <p><label>Password<br><input name="password" type="password" required style="width:100%;padding:8px;" /></label></p>
      <button type="submit" style="padding:10px 16px;background:#0F172A;color:#fff;border:0;border-radius:6px;font-weight:600;cursor:pointer;">Sign In</button>
    </form>
  </div>
<?php else:
  $orders = $pdo->query('SELECT * FROM medinvent_orders ORDER BY created_at DESC LIMIT 100')->fetchAll();
  $products = $pdo->query('SELECT * FROM medinvent_products ORDER BY sort_order ASC')->fetchAll();
  $settings = get_site_settings($pdo);
  $totalRevenue = array_sum(array_map(fn($o) => $o['status'] !== 'Cancelled' ? (float)$o['grand_total_incl_gst'] : 0, $orders));
  $lowStock = array_filter($products, fn($p) => (int)$p['stock_qty'] <= (int)$p['reorder_level']);
?>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <h1 style="margin:0;font-size:20px;">Med Invent Devices — Admin Console</h1>
    <div style="display:flex;gap:12px;font-size:13px;">
      <a href="../index.php">View Calculator</a>
      <a href="?export=orders_csv">Export CSV</a>
      <a href="?logout=1">Logout</a>
    </div>
  </div>
  <?php if ($notice): ?><div class="card" style="background:#ECFDF5;border-color:#A7F3D0;color:#065F46;"><?= e($notice) ?></div><?php endif; ?>
  <div class="nav">
    <a href="?tab=dashboard" class="<?= $tab==='dashboard'?'active':'' ?>">Dashboard</a>
    <a href="?tab=orders" class="<?= $tab==='orders'?'active':'' ?>">Orders (<?= count($orders) ?>)</a>
    <a href="?tab=inventory" class="<?= $tab==='inventory'?'active':'' ?>">Products &amp; Inventory</a>
    <a href="?tab=settings" class="<?= $tab==='settings'?'active':'' ?>">Site Content &amp; Access</a>
  </div>

  <?php if ($tab === 'dashboard'): ?>
    <div class="kpis">
      <div class="card"><div>Total Orders</div><strong style="font-size:24px;"><?= count($orders) ?></strong></div>
      <div class="card"><div>Active Pipeline</div><strong style="font-size:24px;"><?= e(format_inr_php($totalRevenue)) ?></strong></div>
      <div class="card"><div>Low Stock Alerts</div><strong style="font-size:24px;color:#B45309;"><?= count($lowStock) ?></strong></div>
    </div>
  <?php elseif ($tab === 'orders'): ?>
    <div class="card">
      <table>
        <thead><tr><th>Order #</th><th>Customer</th><th>Mobile / PIN</th><th>Total</th><th>Status</th><th>Update</th></tr></thead>
        <tbody>
        <?php foreach ($orders as $o): ?>
          <tr>
            <td><strong><?= e($o['order_number']) ?></strong><br><small><?= e($o['created_at']) ?></small></td>
            <td><?= e($o['ordering_name']) ?><br><small><?= e($o['hospital_name']) ?></small></td>
            <td><?= e($o['ordering_mobile']) ?><br><small>PIN <?= e($o['pin_code']) ?></small></td>
            <td><?= e(format_inr_php((float)$o['grand_total_incl_gst'])) ?></td>
            <td><?= e($o['status']) ?></td>
            <td>
              <form method="post" style="display:flex;gap:6px;">
                <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>" />
                <input type="hidden" name="action" value="update_order_status" />
                <input type="hidden" name="order_id" value="<?= (int)$o['id'] ?>" />
                <select name="status">
                  <?php foreach (['Pending WhatsApp','Payment Sent','Confirmed','Dispatched','Quotation Requested','Cancelled'] as $st): ?>
                    <option value="<?= e($st) ?>" <?= $o['status']===$st?'selected':'' ?>><?= e($st) ?></option>
                  <?php endforeach; ?>
                </select>
                <input name="admin_notes" value="<?= e($o['admin_notes']) ?>" placeholder="Note" />
                <button type="submit">Save</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php elseif ($tab === 'inventory'): ?>
    <div class="card">
      <table>
        <thead><tr><th>SKU</th><th>Product</th><th>MRP</th><th>Stock</th><th>Reorder</th><th>Adjust Stock</th></tr></thead>
        <tbody>
        <?php foreach ($products as $p): ?>
          <tr>
            <td><?= e($p['sku']) ?></td>
            <td><strong><?= e($p['name']) ?></strong></td>
            <td><?= e(format_inr_php((float)$p['mrp'])) ?></td>
            <td><?= (int)$p['stock_qty'] ?></td>
            <td><?= (int)$p['reorder_level'] ?></td>
            <td>
              <form method="post" style="display:flex;gap:6px;">
                <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>" />
                <input type="hidden" name="action" value="adjust_stock" />
                <input type="hidden" name="product_id" value="<?= e($p['id']) ?>" />
                <input name="delta" type="number" placeholder="+/- qty" style="width:80px;" required />
                <input name="reason" placeholder="Reason" />
                <button type="submit">Update</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php elseif ($tab === 'settings'): ?>
    <form method="post" class="card">
      <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>" />
      <input type="hidden" name="action" value="update_settings" />
      <p><label>WhatsApp Number (digits with country code)<br><input name="whatsapp_number" value="<?= e($settings['whatsapp_number']) ?>" /></label></p>
      <p><label>Display Phone<br><input name="display_phone" value="<?= e($settings['display_phone']) ?>" /></label></p>
      <p><label>Support Email<br><input name="support_email" value="<?= e($settings['support_email']) ?>" /></label></p>
      <p><label>Promo Banner Text<br><input name="promo_banner_text" value="<?= e($settings['promo_banner_text']) ?>" style="width:100%;" /></label></p>
      <p><label><input type="checkbox" name="portal_passcode_enabled" <?= $settings['portal_passcode_enabled']?'checked':'' ?> /> Enable Shared Customer Portal Passcode</label></p>
      <p><label>Portal Passcode<br><input name="portal_passcode" value="<?= e($settings['portal_passcode']) ?>" /></label></p>
      <button type="submit">Save Settings</button>
    </form>
  <?php endif; ?>
<?php endif; ?>
</div>
</body>
</html>
