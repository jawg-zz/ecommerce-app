-- Kenyan Market Computer & Computer Accessories Catalogue
-- Migration: 20260406123518_add_kenyan_computer_catalogue
-- Description: Populates the database with realistic Kenyan computer products in KES
-- Target: Product and ProductCollection tables

BEGIN;

-- ============================================
-- PRODUCT COLLECTIONS (Subcategories)
-- ============================================

-- Laptops
INSERT INTO "ProductCollection" (id, name, slug, description, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Laptops', 'laptops', 'Professional, business, and student laptops', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ProductCollection" WHERE slug = 'laptops');

-- Desktop Computers
INSERT INTO "ProductCollection" (id, name, slug, description, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Desktop Computers', 'desktops', 'Desktop PCs and towers for home and office', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ProductCollection" WHERE slug = 'desktops');

-- Monitors
INSERT INTO "ProductCollection" (id, name, slug, description, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Monitors', 'monitors', 'LED and LCD monitors of various sizes', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ProductCollection" WHERE slug = 'monitors');

-- Keyboards & Mice
INSERT INTO "ProductCollection" (id, name, slug, description, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Keyboards & Mice', 'keyboards-mice', 'Wired and wireless keyboards and mice', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ProductCollection" WHERE slug = 'keyboards-mice');

-- Storage
INSERT INTO "ProductCollection" (id, name, slug, description, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Storage', 'storage', 'External SSDs, hard drives, and flash drives', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ProductCollection" WHERE slug = 'storage');

-- Networking
INSERT INTO "ProductCollection" (id, name, slug, description, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Networking', 'networking', 'Routers, WiFi adapters, and network equipment', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ProductCollection" WHERE slug = 'networking');

-- Peripherals
INSERT INTO "ProductCollection" (id, name, slug, description, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Peripherals', 'peripherals', 'Webcams, headsets, printers, and UPS', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ProductCollection" WHERE slug = 'peripherals');

-- ============================================
-- GET COLLECTION IDs FOR REFERENCE
-- ============================================

-- Store collection IDs for use in product inserts
DO $$
DECLARE
    laptops_id TEXT;
    desktops_id TEXT;
    monitors_id TEXT;
    keyboards_mice_id TEXT;
    storage_id TEXT;
    networking_id TEXT;
    peripherals_id TEXT;
BEGIN
    SELECT id INTO laptops_id FROM "ProductCollection" WHERE slug = 'laptops';
    SELECT id INTO desktops_id FROM "ProductCollection" WHERE slug = 'desktops';
    SELECT id INTO monitors_id FROM "ProductCollection" WHERE slug = 'monitors';
    SELECT id INTO keyboards_mice_id FROM "ProductCollection" WHERE slug = 'keyboards-mice';
    SELECT id INTO storage_id FROM "ProductCollection" WHERE slug = 'storage';
    SELECT id INTO networking_id FROM "ProductCollection" WHERE slug = 'networking';
    SELECT id INTO peripherals_id FROM "ProductCollection" WHERE slug = 'peripherals';

    -- ============================================
    -- LAPTOPS (Entry Level - Student/Business)
    -- ============================================

    -- HP 15s (Entry Level - Intel Celeron)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'HP 15s-du2019nia Intel Celeron',
        'Entry-level laptop for basic tasks. Intel Celeron N4020, 4GB RAM, 256GB SSD, 15.6" HD display. Perfect for students and basic office work.',
        52000,
        'ELECTRONICS',
        laptops_id,
        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800',
        25,
        '{"processor": "Intel Celeron N4020", "ram": "4GB DDR4", "storage": "256GB SSD", "display": "15.6 inch HD (1366x768)", "battery": "41Wh", "weight": "1.74kg", "os": "FreeDOS"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Lenovo IdeaPad 1 (AMD Entry Level)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Lenovo IdeaPad 1 AMD Athlon Silver',
        'Affordable everyday laptop. AMD Athlon Silver 3050U, 4GB RAM, 256GB SSD, 15.6" HD display. Good value for basic computing.',
        58000,
        'ELECTRONICS',
        laptops_id,
        'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800',
        30,
        '{"processor": "AMD Athlon Silver 3050U", "ram": "4GB DDR4", "storage": "256GB SSD", "display": "15.6 inch HD", "battery": "35Wh", "weight": "1.6kg", "os": "FreeDOS"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- ============================================
    -- LAPTOPS (Mid-Range - Core i5 / Ryzen 5)
    -- ============================================

    -- HP 15 Core i5 (13th Gen)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'HP 15-fd0229nia Core i5 13th Gen',
        'Powerful mid-range laptop. Intel Core i5-1335U (13th Gen), 8GB RAM, 512GB SSD, 15.6" FHD display. Ideal for professionals and students.',
        95000,
        'ELECTRONICS',
        laptops_id,
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
        20,
        '{"processor": "Intel Core i5-1335U", "ram": "8GB DDR4", "storage": "512GB SSD", "display": "15.6 inch FHD (1920x1080)", "battery": "41Wh", "weight": "1.59kg", "os": "FreeDOS", "ports": ["USB-C", "2x USB-A", "HDMI", "SD card"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Lenovo IdeaPad 3 Core i5
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Lenovo IdeaPad 3 Core i5 12th Gen',
        'Reliable performance laptop. Intel Core i5-1235U, 8GB RAM, 512GB SSD, 15.6" FHD. Great for office work and light creative tasks.',
        88000,
        'ELECTRONICS',
        laptops_id,
        'https://images.unsplash.com/photo-1587614382346-4ec70e388b84?w=800',
        18,
        '{"processor": "Intel Core i5-1235U", "ram": "8GB DDR4", "storage": "512GB SSD", "display": "15.6 inch FHD", "battery": "45Wh", "weight": "1.65kg", "os": "FreeDOS", "features": ["Webcam shutter", "Privacy shot"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Dell Latitude 3445 (AMD Ryzen 5)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Dell Latitude 3445 AMD Ryzen 5',
        'Business-class laptop with AMD Ryzen 5 7520U, 8GB RAM, 256GB SSD, 14" FHD display. Durable build quality.',
        92000,
        'ELECTRONICS',
        laptops_id,
        'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800',
        15,
        '{"processor": "AMD Ryzen 5 7520U", "ram": "8GB DDR5", "storage": "256GB SSD", "display": "14 inch FHD", "battery": "54Wh", "weight": "1.54kg", "os": "FreeDOS", "warranty": "1 year"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- ============================================
    -- LAPTOPS (High-End - Core i7)
    -- ============================================

    -- HP EliteBook 840 G9 (Business)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'HP EliteBook 840 G9 Core i7',
        'Premium business laptop. Intel Core i7-1255U, 16GB RAM, 512GB SSD, 14" WUXGA display. Premium aluminum build with enterprise features.',
        145000,
        'ELECTRONICS',
        laptops_id,
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
        10,
        '{"processor": "Intel Core i7-1255U", "ram": "16GB DDR5", "storage": "512GB SSD", "display": "14 inch WUXGA (1920x1200)", "battery": "53Wh", "weight": "1.35kg", "os": "Windows 11 Pro", "features": ["Fingerprint", "IR Camera", "Backlit KB"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Dell Latitude 7430 Core i7
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Dell Latitude 7430 Core i7',
        'Ultra-premium business laptop. Intel Core i7-1365U, 16GB RAM, 512GB SSD, 14" FHD. Exceptional portability and performance.',
        165000,
        'ELECTRONICS',
        laptops_id,
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800',
        8,
        '{"processor": "Intel Core i7-1365U", "ram": "16GB DDR5", "storage": "512GB SSD", "display": "14 inch FHD", "battery": "58Wh", "weight": "1.22kg", "os": "Windows 11 Pro", "security": ["Fingerprint", "Smart Card"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- ============================================
    -- MONITORS
    -- ============================================

    -- HP P24v G4 (24" Entry)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'HP P24v G4 24" Monitor',
        'Essential 24-inch monitor. Full HD (1920x1080), IPS panel, 60Hz refresh rate. Great for home and office use.',
        22000,
        'ELECTRONICS',
        monitors_id,
        'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800',
        35,
        '{"size": "24 inch", "resolution": "1920x1080", "panel": "IPS", "refresh": "60Hz", "response": "5ms", "ports": ["VGA", "HDMI"], "features": ["Anti-glare", "Low blue light"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- LG 27MK600M (27" Full HD)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'LG 27MK600M-B 27" Full HD Monitor',
        '27-inch Full HD monitor with IPS panel. Great colors and wide viewing angles. Includes built-in speakers.',
        32000,
        'ELECTRONICS',
        monitors_id,
        'https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=800',
        25,
        '{"size": "27 inch", "resolution": "1920x1080", "panel": "IPS", "refresh": "75Hz", "response": "5ms", "ports": ["2x HDMI", "VGA"], "speakers": "5W x2", "features": ["Borderless design", "OnScreen Control"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Samsung S27F350 (27" Curved)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Samsung S27F350FHE 27" LED Monitor',
        'Sleek 27-inch monitor with AMD FreeSync. Full HD resolution, super slim design. Perfect for everyday use.',
        28000,
        'ELECTRONICS',
        monitors_id,
        'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800',
        28,
        '{"size": "27 inch", "resolution": "1920x1080", "panel": "VA", "refresh": "60Hz", "response": "4ms", "ports": ["HDMI", "VGA"], "features": ["AMD FreeSync", "Eye Saver Mode"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- HP P27 G5 (27" Business)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'HP P27 G5 27" FHD Monitor',
        'Professional 27-inch business monitor. Full HD, height adjustable stand, VESA mount compatible.',
        38000,
        'ELECTRONICS',
        monitors_id,
        'https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=800',
        20,
        '{"size": "27 inch", "resolution": "1920x1080", "panel": "IPS", "refresh": "75Hz", "response": "5ms", "ports": ["HDMI", "DisplayPort", "VGA"], "features": ["Height adjustable", "VESA 100x100"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- ============================================
    -- KEYBOARDS & MICE
    -- ============================================

    -- Logitech MK220 Combo (Wireless)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Logitech MK220 Wireless Keyboard & Mouse',
        'Compact wireless combo. 2.4GHz wireless connection, up to 10m range. Long battery life. Perfect for home and office.',
        3500,
        'ELECTRONICS',
        keyboards_mice_id,
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
        50,
        '{"type": "Combo", "connectivity": "2.4GHz wireless", "battery_life": "36 months KB, 12 months mouse", "range": "10m", "keys": "Full-size keyboard"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Logitech K380 (Bluetooth Keyboard)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Logitech K380 Multi-Device Keyboard',
        'Slim Bluetooth keyboard. Connect up to 3 devices, easy-switch buttons. Compact and portable.',
        5500,
        'ELECTRONICS',
        keyboards_mice_id,
        'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800',
        40,
        '{"type": "Keyboard", "connectivity": "Bluetooth 3.0", "devices": "3 devices", "battery": "2 years", "layout": "Compact"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Jedel K32 RGB Keyboard
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Jedel K32 RGB Gaming Keyboard',
        'Gaming keyboard with RGB backlighting. USB wired connection, multimedia keys, anti-ghosting. Great value.',
        2500,
        'ELECTRONICS',
        keyboards_mice_id,
        'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800',
        45,
        '{"type": "Keyboard", "connectivity": "USB Wired", "lighting": "RGB", "keys": "104 keys", "features": ["Anti-ghosting", "Multimedia keys"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Logitech M220 Silent Mouse
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Logitech M220 Silent Wireless Mouse',
        'Compact wireless mouse with 90% noise reduction. 2.4GHz wireless, 18-month battery life. Comfortable for both hands.',
        2200,
        'ELECTRONICS',
        keyboards_mice_id,
        'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
        60,
        '{"type": "Mouse", "connectivity": "2.4GHz wireless", "dpi": "1000", "battery": "18 months", "buttons": "3"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Logitech M90 Wired Mouse
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Logitech M90 Wired USB Mouse',
        'Reliable wired mouse. Plug and play, no software needed. High-definition optical tracking.',
        1200,
        'ELECTRONICS',
        keyboards_mice_id,
        'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800',
        80,
        '{"type": "Mouse", "connectivity": "USB Wired", "dpi": "1000", "tracking": "Optical", "cable": "1.8m"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- ============================================
    -- STORAGE
    -- ============================================

    -- Kingston A400 240GB SSD
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Kingston A400 240GB Internal SSD',
        'Fast internal SSD for laptop upgrade. SATA 3.0, up to 500MB/s read. Dramatically improves boot and load times.',
        6500,
        'ELECTRONICS',
        storage_id,
        'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800',
        40,
        '{"type": "Internal SSD", "capacity": "240GB", "interface": "SATA 3.0", "read_speed": "500MB/s", "write_speed": "350MB/s", "form_factor": "2.5 inch"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Kingston A400 480GB SSD
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Kingston A400 480GB Internal SSD',
        'Large capacity internal SSD. Perfect for storing OS and frequently used applications. Fast and reliable.',
        10500,
        'ELECTRONICS',
        storage_id,
        'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800',
        30,
        '{"type": "Internal SSD", "capacity": "480GB", "interface": "SATA 3.0", "read_speed": "500MB/s", "write_speed": "450MB/s", "form_factor": "2.5 inch"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Samsung T7 Portable SSD 500GB
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Samsung T7 Portable SSD 500GB',
        'Ultra-fast portable SSD. USB 3.2 Gen 2, up to 1050MB/s read. Compact aluminum body, shock resistant.',
        12000,
        'ELECTRONICS',
        storage_id,
        'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800',
        25,
        '{"type": "External SSD", "capacity": "500GB", "interface": "USB 3.2 Gen 2", "read_speed": "1050MB/s", "write_speed": "1000MB/s", "encryption": "AES 256-bit"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Samsung T7 Portable SSD 1TB
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Samsung T7 Portable SSD 1TB',
        'High-capacity portable SSD. 1TB storage with blazing fast speeds. Ideal for large file transfers and backups.',
        18000,
        'ELECTRONICS',
        storage_id,
        'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800',
        18,
        '{"type": "External SSD", "capacity": "1TB", "interface": "USB 3.2 Gen 2", "read_speed": "1050MB/s", "write_speed": "1000MB/s", "encryption": "AES 256-bit"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- SanDisk Cruzer Blade 64GB
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'SanDisk Cruzer Blade 64GB USB Flash Drive',
        'Compact and affordable flash drive. USB 2.0, ideal for basic file transfer. Retractable design.',
        900,
        'ELECTRONICS',
        storage_id,
        'https://images.unsplash.com/photo-1618410320928-25228d811631?w=800',
        100,
        '{"type": "Flash Drive", "capacity": "64GB", "interface": "USB 2.0", "design": "Retractable"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- SanDisk Ultra Flair 128GB
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'SanDisk Ultra Flair 128GB USB 3.0',
        'High-speed flash drive. USB 3.0, up to 150MB/s read. Metal alloy case for durability.',
        1800,
        'ELECTRONICS',
        storage_id,
        'https://images.unsplash.com/photo-1618410320928-25228d811631?w=800',
        75,
        '{"type": "Flash Drive", "capacity": "128GB", "interface": "USB 3.0", "read_speed": "150MB/s", "design": "Metal case"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- ============================================
    -- NETWORKING
    -- ============================================

    -- TP-Link TL-WR840N (Basic Router)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'TP-Link TL-WR840N 300Mbps Wireless N Router',
        'Basic WiFi router for home. 300Mbps wireless speed, 2 antennas, WPA2 security. Ideal for basic browsing and streaming.',
        3200,
        'ELECTRONICS',
        networking_id,
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
        40,
        '{"type": "Router", "speed": "300Mbps", "bands": "2.4GHz", "antennas": "2", "ports": "4x LAN", "standard": "802.11n"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- TP-Link Archer AX10 (WiFi 6)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'TP-Link Archer AX10 WiFi 6 Router',
        'WiFi 6 router at great value. AX1500, dual-band, supports 40+ devices. Future-proof your home network.',
        8500,
        'ELECTRONICS',
        networking_id,
        'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800',
        25,
        '{"type": "Router", "speed": "AX1500", "bands": "2.4GHz + 5GHz", "antennas": "4", "ports": "4x LAN, 1x WAN", "standard": "WiFi 6", "devices": "40+"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- TP-Link Archer C64 (AC1200)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'TP-Link Archer C64 AC1200 Dual Band Router',
        'Reliable dual-band router. AC1200, 4 Gigabit ports, MU-MIMO. Great for streaming and gaming.',
        6500,
        'ELECTRONICS',
        networking_id,
        'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=800',
        30,
        '{"type": "Router", "speed": "AC1200", "bands": "2.4GHz + 5GHz", "antennas": "4", "ports": "4x Gigabit LAN", "features": ["MU-MIMO", "Beamforming"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- TP-Link TL-WN722N (USB WiFi Adapter)
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'TP-Link TL-WN722N High Gain WiFi Adapter',
        'USB WiFi adapter with high-gain antenna. 150Mbps, improves wireless signal. Compatible with most OS.',
        1800,
        'ELECTRONICS',
        networking_id,
        'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800',
        50,
        '{"type": "WiFi Adapter", "speed": "150Mbps", "antenna": "High gain detachable", "interface": "USB 2.0", "standard": "802.11n"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- ============================================
    -- PERIPHERALS
    -- ============================================

    -- Logitech C270 HD Webcam
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Logitech C270 HD Webcam',
        'HD webcam for video calls. 720p HD, built-in mic, automatic light correction. Perfect for Zoom and Teams.',
        4500,
        'ELECTRONICS',
        peripherals_id,
        'https://images.unsplash.com/photo-1587826080692-f439cd0b7c33?w=800',
        35,
        '{"type": "Webcam", "resolution": "720p HD", "fps": "30fps", "mic": "Built-in", "focus": "Fixed", "mount": "Clip/Stand"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Logitech C920 HD Pro Webcam
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Logitech C920 HD Pro Webcam',
        'Professional HD webcam. 1080p, stereo mic, autofocus, auto light correction. Excellent for professional calls.',
        9500,
        'ELECTRONICS',
        peripherals_id,
        'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800',
        20,
        '{"type": "Webcam", "resolution": "1080p FHD", "fps": "30fps", "mic": "Stereo", "focus": "Autofocus", "features": ["Auto light correction", "HD autofocus"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Logitech H390 Headset
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Logitech H390 USB Headset',
        'Comfortable USB headset with mic. Digital stereo sound, padded headband, in-line controls. Great for calls and music.',
        4500,
        'ELECTRONICS',
        peripherals_id,
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        40,
        '{"type": "Headset", "connection": "USB", "mic": "Yes", "controls": "In-line", "ear_cups": "Over-ear padded"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Sony WH-CH520 Wireless Headphones
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Sony WH-CH520 Wireless On-Ear Headphones',
        'Affordable wireless headphones. Bluetooth, up to 50 hours battery, DSEE sound enhancement. Comfortable for long use.',
        7500,
        'ELECTRONICS',
        peripherals_id,
        'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800',
        25,
        '{"type": "Headphones", "connection": "Bluetooth 5.2", "battery": "50 hours", "driver": "30mm", "features": ["DSEE", "Multi-point connection"]}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Canon Pixma MG2522 Printer
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Canon Pixma MG2522 Inkjet Printer',
        'Affordable all-in-one printer. Print, scan, copy. Ideal for home and basic office use. Compact design.',
        18000,
        'ELECTRONICS',
        peripherals_id,
        'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800',
        15,
        '{"type": "Printer", "function": "Print/Scan/Copy", "technology": "Inkjet", "resolution": "4800x600 dpi", "connectivity": "USB", "tray": "60 sheets"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- HP LaserJet Pro M15w
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'HP LaserJet Pro M15w Wireless Printer',
        'Compact laser printer with wireless. Fast print speeds, low running costs. Perfect for home office.',
        45000,
        'ELECTRONICS',
        peripherals_id,
        'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800',
        10,
        '{"type": "Printer", "function": "Print only", "technology": "Laser", "speed": "19 ppm", "connectivity": "WiFi, USB", "duty_cycle": "8000 pages/month"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Eaton 650VA UPS
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Eaton 650VA UPS Battery Backup',
        'Line-interactive UPS for home and office. 650VA/360W, 4 outlets, AVR. Protects computers and electronics from power surges.',
        12000,
        'ELECTRONICS',
        peripherals_id,
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
        20,
        '{"type": "UPS", "capacity": "650VA / 360W", "outlets": "4", "avt": "Yes", "backup_time": "5-30 min", "waveform": "Simulated sine wave"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Eaton 1000VA UPS
    INSERT INTO "Product" (id, name, description, price, category, "categoryId", image, stock, specifications, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Eaton 1000VA UPS Battery Backup',
        'Higher capacity UPS. 1000VA/600W, 6 outlets, AVR, LCD display. Better protection for workstations.',
        22000,
        'ELECTRONICS',
        peripherals_id,
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
        12,
        '{"type": "UPS", "capacity": "1000VA / 600W", "outlets": "6", "avt": "Yes", "display": "LCD", "backup_time": "10-45 min"}'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

END $$;

COMMIT;