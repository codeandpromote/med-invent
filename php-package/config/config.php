<?php
declare(strict_types=1);

// Med Invent Devices - Shared Hosting Configuration
// Update DB_* values with your cPanel / MySQL credentials before uploading.

define('DB_HOST', getenv('MEDINVENT_DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('MEDINVENT_DB_NAME') ?: 'medinvent_calc');
define('DB_USER', getenv('MEDINVENT_DB_USER') ?: 'medinvent_user');
define('DB_PASS', getenv('MEDINVENT_DB_PASS') ?: 'CHANGE_ME_STRONG_PASSWORD');
define('DB_CHARSET', 'utf8mb4');

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_samesite', 'Lax');
    session_start();
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    return $pdo;
}

function e(?string $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function csrf_token(): string
{
    if (empty($_SESSION['mid_csrf_token'])) {
        $_SESSION['mid_csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['mid_csrf_token'];
}

function verify_csrf(?string $token): bool
{
    if (empty($_SESSION['mid_csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['mid_csrf_token'], $token);
}

function get_site_settings(PDO $pdo): array
{
    $rows = $pdo->query('SELECT setting_key, setting_value FROM medinvent_site_settings')->fetchAll();
    $map = [];
    foreach ($rows as $row) {
        $map[$row['setting_key']] = $row['setting_value'];
    }
    $terms = json_decode($map['terms_json'] ?? '[]', true);
    if (!is_array($terms)) {
        $terms = [];
    }
    return [
        'company_name'            => $map['company_name'] ?? 'Med Invent Devices Pvt Ltd',
        'website_url'             => $map['website_url'] ?? 'https://www.medinventdevices.com/corporate/index2.php',
        'whatsapp_number'         => $map['whatsapp_number'] ?? '919051112020',
        'display_phone'           => $map['display_phone'] ?? '+91 90511 12020',
        'support_email'           => $map['support_email'] ?? 'info@medinventdevices.com',
        'promo_banner_text'       => $map['promo_banner_text'] ?? '',
        'delivery_coverage_note'  => $map['delivery_coverage_note'] ?? '',
        'distributor_disclaimer'  => $map['distributor_disclaimer'] ?? '',
        'terms'                   => $terms,
        'portal_passcode_enabled' => ($map['portal_passcode_enabled'] ?? '0') === '1',
        'portal_passcode'         => $map['portal_passcode'] ?? 'BHEX2026',
    ];
}
