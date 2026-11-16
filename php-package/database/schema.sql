-- Med Invent Devices Pvt Ltd - Customer Pricing & Ordering Calculator
-- Compatible with MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.4+ (InnoDB, utf8mb4)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `medinvent_products` (
  `id` VARCHAR(64) NOT NULL,
  `sku` VARCHAR(64) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `short_name` VARCHAR(80) NOT NULL,
  `category` ENUM('expander', 'forceps', 'accessory') NOT NULL DEFAULT 'expander',
  `mrp` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `expiry_note` VARCHAR(100) NOT NULL DEFAULT 'Exp 3 Yrs',
  `gst_rate_pct` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `description` TEXT NOT NULL,
  `accent_theme` VARCHAR(24) NOT NULL DEFAULT 'blue',
  `max_online_qty` INT UNSIGNED NOT NULL DEFAULT 20,
  `stock_qty` INT NOT NULL DEFAULT 0,
  `reorder_level` INT NOT NULL DEFAULT 20,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_sku` (`sku`),
  KEY `idx_active_cat` (`is_active`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `medinvent_product_tiers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` VARCHAR(64) NOT NULL,
  `min_qty` INT UNSIGNED NOT NULL,
  `base_rate` DECIMAL(10,2) NOT NULL,
  `incl_gst_rate` DECIMAL(10,2) NOT NULL,
  `pack_label` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_prod_min` (`product_id`, `min_qty`),
  CONSTRAINT `fk_tier_product` FOREIGN KEY (`product_id`) REFERENCES `medinvent_products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `medinvent_combos` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `expander_product_id` VARCHAR(64) NOT NULL,
  `expander_qty` INT UNSIGNED NOT NULL,
  `forceps_product_id` VARCHAR(64) NOT NULL,
  `forceps_qty` INT UNSIGNED NOT NULL DEFAULT 1,
  `combo_price_incl_gst` DECIMAL(10,2) NOT NULL,
  `mrp_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `accent_theme` VARCHAR(24) NOT NULL DEFAULT 'blue',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_combo_code` (`code`),
  CONSTRAINT `fk_combo_exp` FOREIGN KEY (`expander_product_id`) REFERENCES `medinvent_products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_combo_frc` FOREIGN KEY (`forceps_product_id`) REFERENCES `medinvent_products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `medinvent_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(40) NOT NULL,
  `status` ENUM('Pending WhatsApp', 'Payment Sent', 'Confirmed', 'Dispatched', 'Quotation Requested', 'Cancelled') NOT NULL DEFAULT 'Pending WhatsApp',
  `ordering_name` VARCHAR(120) NOT NULL,
  `ordering_mobile` VARCHAR(20) NOT NULL,
  `billing_address` TEXT NOT NULL,
  `delivery_address` TEXT NOT NULL,
  `pin_code` VARCHAR(10) NOT NULL,
  `receiving_name` VARCHAR(120) NOT NULL,
  `receiving_mobile` VARCHAR(20) NOT NULL,
  `hospital_name` VARCHAR(160) DEFAULT NULL,
  `email` VARCHAR(160) DEFAULT NULL,
  `gstin` VARCHAR(20) DEFAULT NULL,
  `customer_notes` TEXT DEFAULT NULL,
  `subtotal_base` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `gst_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `grand_total_incl_gst` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `has_quotation_items` TINYINT(1) NOT NULL DEFAULT 0,
  `whatsapp_message` MEDIUMTEXT NOT NULL,
  `admin_notes` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_order_number` (`order_number`),
  KEY `idx_status_created` (`status`, `created_at`),
  KEY `idx_mobile` (`ordering_mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `medinvent_order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `item_type` ENUM('product', 'combo', 'quotation') NOT NULL,
  `ref_id` VARCHAR(64) NOT NULL,
  `item_name` VARCHAR(180) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `applied_tier_min_qty` INT UNSIGNED DEFAULT NULL,
  `unit_rate_incl_gst` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `line_total_incl_gst` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  CONSTRAINT `fk_item_order` FOREIGN KEY (`order_id`) REFERENCES `medinvent_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `medinvent_inventory_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` VARCHAR(64) NOT NULL,
  `delta` INT NOT NULL,
  `previous_stock` INT NOT NULL,
  `new_stock` INT NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `actor` VARCHAR(120) NOT NULL DEFAULT 'Admin',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_prod_created` (`product_id`, `created_at`),
  CONSTRAINT `fk_inv_product` FOREIGN KEY (`product_id`) REFERENCES `medinvent_products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `medinvent_site_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` MEDIUMTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `medinvent_admin_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(160) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Products
INSERT INTO `medinvent_products`
(`id`, `sku`, `name`, `short_name`, `category`, `mrp`, `expiry_note`, `gst_rate_pct`, `description`, `accent_theme`, `max_online_qty`, `stock_qty`, `reorder_level`, `is_active`, `sort_order`)
VALUES
('b-hex', 'MID-BHEX-01', 'B-HEX® Pupil Expander', 'B-HEX®', 'expander', 2995.00, 'Exp 3 Yrs', 5.00, 'Globally patented flexible hexagonal pupil expander for small pupil surgery. Sterile single-use.', 'blue', 20, 148, 30, 1, 1),
('b-hex-2', 'MID-BHEX-20', 'B-HEX® Pupil Expander 2.0', 'B-HEX® 2.0', 'expander', 3555.00, 'Exp 3 Yrs', 5.00, 'Second-generation B-HEX® 2.0 with enhanced iris-engagement geometry.', 'lime', 20, 112, 25, 1, 2),
('b-octa', 'MID-BOCTA-80', 'B-OCTA 8.00 Pupil Expander', 'B-OCTA 8.00', 'expander', 3555.00, 'Exp 3 Yrs', 5.00, '8.00 mm octagonal wide-aperture pupil expander for enhanced surgical field.', 'terracotta', 20, 64, 20, 1, 3),
('b-hex-forceps', 'MID-FRC-23G', 'B-HEX® 23G Forceps', '23G Forceps', 'forceps', 14000.00, 'Reusable Surgical Steel', 12.00, 'Genuine B-HEX® 23G Forceps is a necessary accessory with imprinted logos.', 'crimson', 20, 18, 15, 1, 4)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Seed Tiers
INSERT INTO `medinvent_product_tiers` (`product_id`, `min_qty`, `base_rate`, `incl_gst_rate`, `pack_label`) VALUES
('b-hex', 1, 1800.00, 1890.00, '1 Pc'),
('b-hex', 5, 1500.00, 1575.00, '5 Pcs Pack'),
('b-hex', 10, 1450.00, 1522.50, '10 Pcs Pack'),
('b-hex', 20, 1400.00, 1470.00, '20 Pcs Pack'),
('b-hex-2', 1, 2000.00, 2100.00, '1 Pc'),
('b-hex-2', 5, 1700.00, 1785.00, '5 Pcs Pack'),
('b-hex-2', 10, 1650.00, 1732.50, '10 Pcs Pack'),
('b-hex-2', 20, 1600.00, 1680.00, '20 Pcs Pack'),
('b-octa', 1, 2000.00, 2100.00, '1 Pc'),
('b-octa', 5, 1700.00, 1785.00, '5 Pcs Pack'),
('b-octa', 10, 1650.00, 1732.50, '10 Pcs Pack'),
('b-octa', 20, 1600.00, 1680.00, '20 Pcs Pack'),
('b-hex-forceps', 1, 5892.86, 6600.00, '1 Pc')
ON DUPLICATE KEY UPDATE `incl_gst_rate` = VALUES(`incl_gst_rate`);

-- Seed Combos
INSERT INTO `medinvent_combos`
(`id`, `code`, `name`, `expander_product_id`, `expander_qty`, `forceps_product_id`, `forceps_qty`, `combo_price_incl_gst`, `mrp_total`, `accent_theme`, `is_active`)
VALUES
('combo-bhex-2', 'CMB-BHEX-2', 'B-HEX® + 23G Forceps (2 + 1 Pack)', 'b-hex', 2, 'b-hex-forceps', 1, 9449.00, 19990.00, 'blue', 1),
('combo-bhex-5', 'CMB-BHEX-5', 'B-HEX® + 23G Forceps (5 + 1 Pack)', 'b-hex', 5, 'b-hex-forceps', 1, 14099.00, 28975.00, 'blue', 1),
('combo-bhex-10', 'CMB-BHEX-10', 'B-HEX® + 23G Forceps (10 + 1 Pack)', 'b-hex', 10, 'b-hex-forceps', 1, 21825.00, 43950.00, 'blue', 1),
('combo-bhex2-2', 'CMB-BHEX2-2', 'B-HEX® 2.0 + 23G Forceps (2 + 1 Pack)', 'b-hex-2', 2, 'b-hex-forceps', 1, 9889.00, 21110.00, 'lime', 1),
('combo-bhex2-5', 'CMB-BHEX2-5', 'B-HEX® 2.0 + 23G Forceps (5 + 1 Pack)', 'b-hex-2', 5, 'b-hex-forceps', 1, 15049.00, 31775.00, 'lime', 1),
('combo-bhex2-10', 'CMB-BHEX2-10', 'B-HEX® 2.0 + 23G Forceps (10 + 1 Pack)', 'b-hex-2', 10, 'b-hex-forceps', 1, 23925.00, 49550.00, 'lime', 1),
('combo-bocta-2', 'CMB-BOCTA-2', 'B-OCTA 8.00 + 23G Forceps (2 + 1 Pack)', 'b-octa', 2, 'b-hex-forceps', 1, 9889.00, 21110.00, 'terracotta', 1),
('combo-bocta-5', 'CMB-BOCTA-5', 'B-OCTA 8.00 + 23G Forceps (5 + 1 Pack)', 'b-octa', 5, 'b-hex-forceps', 1, 15049.00, 31775.00, 'terracotta', 1),
('combo-bocta-10', 'CMB-BOCTA-10', 'B-OCTA 8.00 + 23G Forceps (10 + 1 Pack)', 'b-octa', 10, 'b-hex-forceps', 1, 23925.00, 49550.00, 'terracotta', 1)
ON DUPLICATE KEY UPDATE `combo_price_incl_gst` = VALUES(`combo_price_incl_gst`);

-- Seed Site Settings
INSERT INTO `medinvent_site_settings` (`setting_key`, `setting_value`) VALUES
('company_name', 'Med Invent Devices Pvt Ltd'),
('website_url', 'https://www.medinventdevices.com/corporate/index2.php'),
('whatsapp_number', '919051112020'),
('display_phone', '+91 90511 12020'),
('support_email', 'info@medinventdevices.com'),
('promo_banner_text', 'India Direct Customer Rates · Inclusive of GST & Free Shipping across India'),
('delivery_coverage_note', 'Applicable only within India. Paid using INR account only. Delivered only to an address in India.'),
('distributor_disclaimer', 'Distributors CANNOT supply COMBO offers. These are discounted promo packs directly from Med Invent Devices.'),
('terms_json', '["Input correct GST number if it is to be mentioned on the invoice.","For invoices requiring buyer\'s (person, hospital, clinic LLP or company) GST number, payment should be made by the buyer / owner / director / proprietor only.","Payment details will be sent to the mobile number of person ordering.","Prices are valid for 30 days from order date.","Goods will be dispatched within 3 days after receipt of full payment unless notified otherwise."]'),
('portal_passcode_enabled', '0'),
('portal_passcode', 'BHEX2026')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- Default Admin User (Password: MedInvent@2026 - change immediately after login)
INSERT INTO `medinvent_admin_users` (`email`, `password_hash`, `full_name`) VALUES
('admin@medinventdevices.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Med Invent Administrator')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

SET FOREIGN_KEY_CHECKS = 1;
