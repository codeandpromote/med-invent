<?php
declare(strict_types=1);

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/pricing_engine.php';

$pdo = db();
$settings = get_site_settings($pdo);
$catalog = load_active_catalog($pdo);

// Shared Portal Passcode Gate (when enabled by Admin)
$passcodeError = '';
if ($settings['portal_passcode_enabled']) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['portal_passcode'])) {
        if (verify_csrf($_POST['csrf_token'] ?? '') && hash_equals($settings['portal_passcode'], trim((string)$_POST['portal_passcode']))) {
            $_SESSION['mid_portal_unlocked'] = true;
            header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
            exit;
        } else {
            $passcodeError = 'Incorrect access passcode. Please contact Med Invent Devices.';
        }
    }
}

$isUnlocked = !$settings['portal_passcode_enabled'] || !empty($_SESSION['mid_portal_unlocked']);
$csrf = csrf_token();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Customer Pricing &amp; Ordering Calculator — <?= e($settings['company_name']) ?></title>
  <style>
    :root { --navy:#0F172A; --blue:#1D4ED8; --bg:#F8FAFC; --card:#FFFFFF; --border:#E2E8F0; --muted:#475569; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--navy); line-height:1.5; }
    .container { max-width:1160px; margin:0 auto; padding:20px 16px 64px; }
    header { background:#fff; border-bottom:1px solid var(--border); padding:14px 16px; }
    .header-inner { max-width:1160px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    .brand { font-weight:700; font-size:18px; color:var(--navy); text-decoration:none; }
    .grid { display:grid; grid-template-columns:1fr; gap:24px; margin-top:20px; }
    @media(min-width:960px){ .grid { grid-template-columns:1.35fr 0.95fr; align-items:start; } }
    .card { background:#fff; border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:16px; }
    .qty-input { width:72px; padding:8px; border:1px solid #CBD5E1; border-radius:8px; text-align:center; font-weight:600; font-variant-numeric:tabular-nums; }
    .btn { display:inline-flex; align-items:center; justify-content:center; padding:12px 18px; border-radius:8px; border:0; font-weight:600; cursor:pointer; font-size:14px; }
    .btn-primary { background:#15803D; color:#fff; width:100%; }
    .btn-pack { background:#F1F5F9; color:var(--navy); border:1px solid #CBD5E1; padding:6px 10px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; }
    .field { margin-bottom:12px; }
    .field label { display:block; font-size:13px; font-weight:600; margin-bottom:4px; }
    .field input, .field textarea { width:100%; padding:10px 12px; border:1px solid #CBD5E1; border-radius:8px; font-size:14px; }
    .error { color:#B91C1C; font-size:12px; margin-top:4px; }
    .num { font-variant-numeric:tabular-nums; }
    .banner { background:#EFF6FF; border:1px solid #BFDBFE; color:#1E3A8A; padding:10px 14px; border-radius:8px; font-size:13px; }
    .combo-alert { background:#ECFDF5; border:1px solid #A7F3D0; color:#065F46; padding:12px 14px; border-radius:10px; margin-bottom:14px; }
  </style>
</head>
<body>
<header>
  <div class="header-inner">
    <a class="brand" href="<?= e($settings['website_url']) ?>"><?= e($settings['company_name']) ?></a>
    <div style="font-size:13px;color:var(--muted);">
      WhatsApp: <strong><?= e($settings['display_phone']) ?></strong> · <?= e($settings['support_email']) ?> ·
      <a href="admin/" style="color:var(--blue);font-weight:600;text-decoration:none;">Admin</a>
    </div>
  </div>
</header>

<div class="container">
<?php if (!$isUnlocked): ?>
  <div class="card" style="max-width:440px;margin:48px auto;">
    <h1 style="margin:0 0 8px;font-size:20px;">Customer Order Portal Access</h1>
    <p style="font-size:14px;color:var(--muted);margin:0 0 16px;">Enter the shared customer access passcode provided by <?= e($settings['company_name']) ?>.</p>
    <?php if ($passcodeError): ?><p class="error"><?= e($passcodeError) ?></p><?php endif; ?>
    <form method="post">
      <input type="hidden" name="csrf_token" value="<?= e($csrf) ?>" />
      <div class="field">
        <label for="portal_passcode">Access Passcode</label>
        <input id="portal_passcode" name="portal_passcode" type="password" required />
      </div>
      <button type="submit" class="btn btn-primary" style="background:var(--blue);">Unlock Calculator</button>
    </form>
  </div>
<?php else: ?>
  <div class="banner"><?= e($settings['promo_banner_text']) ?> · <?= e($settings['delivery_coverage_note']) ?></div>

  <div class="grid">
    <div>
      <div class="card">
        <h1 style="margin:0 0 6px;font-size:22px;">Ophthalmic Devices &amp; Forceps</h1>
        <p style="margin:0 0 16px;font-size:13px;color:var(--muted);">Select any quantity from 1 to 20 pcs (intermediate quantities apply the lower pack tier rate). Above 20 pcs: contact for quotation.</p>
        <div id="product-list"></div>
      </div>

      <div class="card">
        <h2 style="margin:0 0 6px;font-size:18px;">Discounted Combo Promo Packs</h2>
        <p style="margin:0 0 14px;font-size:13px;color:#B91C1C;font-weight:600;"><?= e($settings['distributor_disclaimer']) ?></p>
        <div id="combo-list"></div>
      </div>
    </div>

    <div>
      <div class="card">
        <h2 style="margin:0 0 12px;font-size:18px;">Order Request Summary</h2>
        <div id="combo-suggestion-box" style="display:none;" class="combo-alert"></div>
        <div id="summary-lines" style="font-size:14px;margin-bottom:14px;"></div>
        <div style="border-top:1px solid var(--border);padding-top:12px;display:flex;justify-content:space-between;font-weight:700;font-size:17px;">
          <span>Total Payable (Incl. GST &amp; Free Shipping)</span>
          <span id="grand-total" class="num">₹0</span>
        </div>
      </div>

      <form id="order-form" class="card" novalidate>
        <h2 style="margin:0 0 12px;font-size:18px;">Customer &amp; Delivery Details (India)</h2>
        <div class="field"><label>Person Ordering Name *</label><input name="orderingName" required /></div>
        <div class="field"><label>Person Ordering Mobile (10 digits) *</label><input name="orderingMobile" required inputmode="numeric" /></div>
        <div class="field"><label>Billing Address *</label><textarea name="billingAddress" rows="2" required></textarea></div>
        <div class="field"><label>Delivery Address *</label><textarea name="deliveryAddress" rows="2" required></textarea></div>
        <div class="field"><label>PIN Code (6 digits) *</label><input name="pinCode" required inputmode="numeric" /></div>
        <div class="field"><label>Person Receiving Name *</label><input name="receivingName" required /></div>
        <div class="field"><label>Person Receiving Mobile (10 digits) *</label><input name="receivingMobile" required inputmode="numeric" /></div>
        <div class="field"><label>Hospital / Clinic Name (Optional)</label><input name="hospitalName" /></div>
        <div class="field"><label>Email (Optional)</label><input name="email" type="email" /></div>
        <div class="field"><label>GSTIN (Optional)</label><input name="gstin" maxlength="15" /></div>
        <div class="field"><label>Notes (Optional)</label><input name="notes" /></div>
        <div id="form-error" class="error" style="margin-bottom:10px;"></div>
        <button type="submit" class="btn btn-primary">Send order request on WhatsApp</button>

        <ol style="margin:16px 0 0;padding-left:18px;font-size:12px;color:var(--muted);">
          <?php foreach ($settings['terms'] as $term): ?>
            <li style="margin-bottom:4px;"><?= e($term) ?></li>
          <?php endforeach; ?>
        </ol>
      </form>

      <div id="order-success" class="card" style="display:none;border-color:#86EFAC;background:#F0FDF4;">
        <h3 style="margin:0 0 6px;">Order Request Recorded (<span id="res-order-no"></span>)</h3>
        <p style="font-size:13px;margin:0 0 12px;">Click below to send your itemized order request to <?= e($settings['display_phone']) ?> on WhatsApp.</p>
        <a id="wa-open-link" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="text-decoration:none;">Open Itemized Message in WhatsApp</a>
      </div>
    </div>
  </div>

<script>
const PRODUCTS = <?= json_encode($catalog['products'], JSON_HEX_TAG | JSON_HEX_APOS) ?>;
const COMBOS = <?= json_encode($catalog['combos'], JSON_HEX_TAG | JSON_HEX_APOS) ?>;
const CSRF_TOKEN = <?= json_encode($csrf) ?>;
const prodQty = {};
const comboQty = {};

function formatINR(v){ const r = Math.round(v*100)/100; return '₹' + r.toLocaleString('en-IN', { maximumFractionDigits: r % 1 === 0 ? 0 : 2 }); }
function resolveTier(tiers, qty){ let t = tiers[0]; for(const x of tiers){ if(qty >= x.min_qty) t = x; else break; } return t; }

function renderLists(){
  const pEl = document.getElementById('product-list');
  pEl.innerHTML = PRODUCTS.map(p => {
    const q = prodQty[p.id] || 0;
    const packs = p.tiers.map(t => `<button type="button" class="btn-pack" onclick="setProdQty('${p.id}', ${t.min_qty})">${t.min_qty} pc · ${formatINR(t.incl_gst_rate)}/pc</button>`).join(' ');
    return `<div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">
        <div><strong>${p.name}</strong><div style="font-size:12px;color:#475569;">MRP ${formatINR(p.mrp)} · ${p.expiry_note}</div></div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button type="button" class="btn-pack" onclick="setProdQty('${p.id}', Math.max(0, ${q}-1))">-</button>
          <input class="qty-input" type="number" min="0" max="99" value="${q}" onchange="setProdQty('${p.id}', parseInt(this.value||0,10))" />
          <button type="button" class="btn-pack" onclick="setProdQty('${p.id}', ${q}+1)">+</button>
        </div>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${packs}</div>
      ${q > p.max_online_qty ? '<div style="margin-top:6px;font-size:12px;color:#B45309;font-weight:600;">Quantity &gt; 20: Contact us for a quotation</div>' : ''}
    </div>`;
  }).join('');

  const cEl = document.getElementById('combo-list');
  cEl.innerHTML = COMBOS.map(c => {
    const q = comboQty[c.id] || 0;
    return `<div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div><strong>${c.name}</strong><div style="font-size:12px;color:#475569;">Promo Rate: <strong class="num">${formatINR(c.combo_price_incl_gst)}</strong> (Incl. GST &amp; Free Shipping)</div></div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button type="button" class="btn-pack" onclick="setComboQty('${c.id}', Math.max(0, ${q}-1))">-</button>
        <input class="qty-input" type="number" min="0" max="20" value="${q}" onchange="setComboQty('${c.id}', parseInt(this.value||0,10))" />
        <button type="button" class="btn-pack" onclick="setComboQty('${c.id}', ${q}+1)">+</button>
      </div>
    </div>`;
  }).join('');
}

function setProdQty(id, val){ prodQty[id] = Math.max(0, isNaN(val)?0:val); renderAll(); }
function setComboQty(id, val){ comboQty[id] = Math.max(0, isNaN(val)?0:val); renderAll(); }

function renderSummary(){
  let total = 0; const lines = [];
  for(const p of PRODUCTS){
    const q = prodQty[p.id] || 0; if(!q) continue;
    if(q > p.max_online_qty){ lines.push(`<div>${p.name} × ${q} — <em>Contact for quotation</em></div>`); continue; }
    const t = resolveTier(p.tiers, q);
    const lt = Math.round(t.incl_gst_rate * q * 100)/100; total += lt;
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${p.name} × ${q} (${t.min_qty}+ tier)</span><strong class="num">${formatINR(lt)}</strong></div>`);
  }
  for(const c of COMBOS){
    const q = comboQty[c.id] || 0; if(!q) continue;
    const lt = Math.round(c.combo_price_incl_gst * q * 100)/100; total += lt;
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${c.name} × ${q}</span><strong class="num">${formatINR(lt)}</strong></div>`);
  }
  document.getElementById('summary-lines').innerHTML = lines.length ? lines.join('') : '<div style="color:#64748B;">No items selected yet.</div>';
  document.getElementById('grand-total').textContent = formatINR(total);
}

function renderAll(){ renderLists(); renderSummary(); }
renderAll();

document.getElementById('order-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const errEl = document.getElementById('form-error'); errEl.textContent = '';
  const fd = new FormData(ev.target);
  const customer = Object.fromEntries(fd.entries());
  const res = await fetch('api/submit_order.php', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ csrfToken: CSRF_TOKEN, customer, productQuantities: prodQty, comboQuantities: comboQty })
  });
  const data = await res.json();
  if(!res.ok){ errEl.textContent = data.error || 'Please check required fields.'; return; }
  document.getElementById('res-order-no').textContent = data.orderNumber;
  document.getElementById('wa-open-link').href = data.whatsappUrl;
  document.getElementById('order-success').style.display = 'block';
});
</script>
<?php endif; ?>
</div>
</body>
</html>
