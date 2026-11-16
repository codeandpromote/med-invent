# Med Invent Devices — PHP & MySQL Deployment Guide

This package is designed for **shared PHP + MySQL hosting** (cPanel / Apache / LiteSpeed / PHP 8.0+ / MySQL 5.7+ or 8.0+ / MariaDB 10.4+) and integrates cleanly into a subfolder alongside your existing website (`https://www.medinventdevices.com/corporate/index2.php`).

---

## Folder Structure

Upload the contents of this folder into a dedicated subdirectory on your server, for example `/public_html/order-calculator/` (accessible at `https://www.medinventdevices.com/order-calculator/`):

```text
order-calculator/
├── .htaccess                  # Protects config/, database/, includes/ from direct HTTP access
├── index.php                  # Mobile-friendly Customer Pricing & WhatsApp Ordering Calculator
├── config/
│   └── config.php             # MySQL PDO credentials, CSRF & session security
├── database/
│   └── schema.sql             # Complete MySQL schema + Med Invent Devices seed rates
├── includes/
│   ├── pricing_engine.php     # Server-side tier pricing, combo & WhatsApp formatter
│   └── validation.php         # Indian mobile, PIN, GSTIN & compulsory field validation
├── api/
│   └── submit_order.php       # Transactional PDO order saver + stock update + WhatsApp URL
└── admin/
    └── index.php              # Admin Panel (Orders, Products, Inventory, Site Content, Reports)
```

---

## Installation Steps (cPanel / Shared Server)

1. **Create MySQL Database & User**
   - In cPanel → **MySQL Databases**, create a new database (e.g. `medinvent_calc`) and a user with `ALL PRIVILEGES`.

2. **Import Schema & Seed Data**
   - Open **phpMyAdmin**, select your new database, click **Import**, and upload `database/schema.sql`.
   - This creates all 8 tables (`medinvent_products`, `medinvent_product_tiers`, `medinvent_combos`, `medinvent_orders`, `medinvent_order_items`, `medinvent_inventory_logs`, `medinvent_site_settings`, `medinvent_admin_users`) and seeds all current B-HEX®, B-HEX® 2.0, B-OCTA 8.00, 23G Forceps, and Combo rates.

3. **Configure Database Credentials**
   - Edit `config/config.php` and update `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, and `APP_BASE_URL`.
   - Default Admin login created by `schema.sql`:
     - **Email**: `admin@medinventdevices.com`
     - **Password**: `MedInvent@2026` *(Change this immediately inside the Admin Panel or via SQL `password_hash()`).*

4. **Upload Files**
   - Upload all files inside `order-calculator/` via cPanel File Manager or SFTP.
   - Verify `.htaccess` is present so `config/`, `database/`, and `includes/` cannot be browsed directly.

5. **Link from Your Existing Website (`corporate/index2.php`)**
   - Add a navigation link or button pointing to `/order-calculator/`.
   - Because this portal uses an **unlisted link + optional shared password**, you can enable/change the shared customer passcode anytime inside `/order-calculator/admin/`.

---

## Security Highlights
- **PDO Prepared Statements** everywhere (SQL injection protected).
- **Server-Side Authoritative Pricing**: Client totals are never trusted; `api/submit_order.php` recalculates every tier and combo price from MySQL before saving.
- **Transactional Stock Integrity**: Orders lock product rows (`FOR UPDATE`) and record every stock delta in `medinvent_inventory_logs`.
- **CSRF Protection**: All customer & admin POST forms validate session-bound CSRF tokens (`hash_equals`).
- **XSS Escaping**: All outputs use `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')`.
