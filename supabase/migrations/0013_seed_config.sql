-- ============================================================================
-- 0013  Seed: store configuration, delivery zones, coupons, banners
-- ============================================================================
-- Everything in this file is business configuration an admin is expected to
-- edit later through /admin/settings. None of it is hardcoded in React.
--
-- Delivery pricing reflects what Bangladeshi couriers actually charge in 2026:
-- Steadfast/Pathao inside-city is around ৳60-70, sub-urban ৳100-110, divisional
-- metro ৳130, and the long tail of upazila-level delivery ৳150.

-- ── Settings ────────────────────────────────────────────────────────────────
insert into public.settings (key, value, description, is_public) values
  ('store_name', '"Nazmul"'::jsonb,
   'Storefront name used in the header, emails and meta tags', true),
  ('store_tagline', '"Electronics, honestly priced."'::jsonb,
   'Short line under the logo and in the OG description', true),
  ('store_description',
   '"Nazmul is a Dhaka-based electronics retailer. Official-warranty phones, laptops, audio and smart home gear, delivered nationwide with cash on delivery."'::jsonb,
   'Default meta description', true),
  ('support_phone', '"+8801812345678"'::jsonb, 'Shown in the header and order emails', true),
  ('support_whatsapp', '"+8801812345678"'::jsonb, 'WhatsApp click-to-chat number', true),
  ('support_email', '"support@nazmul.com.bd"'::jsonb, 'Customer support inbox', true),
  ('support_hours', '"Saturday–Thursday, 10:00–20:00"'::jsonb, 'Support availability', true),
  ('showroom_address',
   '"Level 4, Bashundhara City Shopping Complex, Panthapath, Dhaka 1205"'::jsonb,
   'Physical pickup location', true),
  ('social_links',
   '{"facebook":"https://facebook.com/nazmulbd","instagram":"https://instagram.com/nazmulbd","youtube":"https://youtube.com/@nazmulbd"}'::jsonb,
   'Footer social profiles', true),
  ('currency', '{"code":"BDT","symbol":"৳","locale":"en-BD"}'::jsonb,
   'Display currency. Money is stored as integer paisa everywhere.', true),
  ('cod_advance_threshold_paisa', '5000000'::jsonb,
   'Orders above ৳50,000 require an advance payment before COD dispatch', true),
  ('return_window_days', '7'::jsonb, 'Days a customer has to request a return', true),
  ('warranty_note',
   '"Warranty is honoured through the brand''s authorised Bangladesh service centre. Keep the invoice — we can re-issue it from your account at any time."'::jsonb,
   'Shown on product pages and the warranty policy page', true),
  ('supabase_url', '"https://padfvqjdmtcmowajqrhu.supabase.co"'::jsonb,
   'Public project URL, used to build storage URLs. Same value as NEXT_PUBLIC_SUPABASE_URL — public by definition.', true),
  ('low_stock_banner_threshold', '5'::jsonb,
   'Product pages show "only N left" at or below this count', true),
  ('order_notification_emails', '[]'::jsonb,
   'Extra recipients for new-order notifications (admin editable)', false),
  ('analytics_retention_days', '180'::jsonb,
   'How far back the admin dashboard queries. Keeps the free-tier query cheap.', false)
on conflict (key) do update
  set value       = excluded.value,
      description = excluded.description,
      is_public   = excluded.is_public;

-- ── Delivery zones ──────────────────────────────────────────────────────────
insert into public.delivery_zones
  (name, slug, fee_paisa, free_above_paisa, min_days, max_days, districts, is_fallback, position)
values
  ('Inside Dhaka City', 'inside-dhaka', 6000, 500000, 1, 2,
   array['Dhaka'], false, 1),
  ('Dhaka Suburbs', 'dhaka-suburbs', 10000, 800000, 2, 3,
   array['Gazipur','Narayanganj','Narsingdi','Munshiganj','Manikganj','Savar','Keraniganj'], false, 2),
  ('Divisional Cities', 'divisional-cities', 13000, 1000000, 2, 4,
   array['Chattogram','Sylhet','Khulna','Rajshahi','Barishal','Rangpur','Mymensingh','Cumilla','Bogura','Jashore'],
   false, 3),
  ('Rest of Bangladesh', 'rest-of-bangladesh', 15000, 1200000, 3, 5,
   array[]::text[], true, 4)
on conflict (slug) do update
  set name             = excluded.name,
      fee_paisa        = excluded.fee_paisa,
      free_above_paisa = excluded.free_above_paisa,
      min_days         = excluded.min_days,
      max_days         = excluded.max_days,
      districts        = excluded.districts,
      is_fallback      = excluded.is_fallback,
      position         = excluded.position,
      is_active        = true;

-- ── Coupons ─────────────────────────────────────────────────────────────────
-- No product/category scoping on these four, so they apply to any eligible
-- line. Scoped coupons are created by the admin UI.
insert into public.coupons
  (code, description, discount_type, discount_value, min_order_paisa,
   max_discount_paisa, starts_at, expires_at, usage_limit, per_user_limit)
values
  ('WELCOME200', 'Flat ৳200 off your first order over ৳3,000',
   'fixed', 20000, 300000, null, now() - interval '1 day', now() + interval '180 days', null, 1),
  ('NAZMUL10', '10% off, up to ৳1,500 — sitewide',
   'percentage', 10, 500000, 150000, now() - interval '1 day', now() + interval '90 days', 2000, 3),
  ('EIDGIFT', 'Eid offer: 7% off with no minimum',
   'percentage', 7, 0, 200000, now() - interval '1 day', now() + interval '30 days', 5000, 2),
  ('FREESHIP', 'Flat ৳150 off to cover nationwide delivery',
   'fixed', 15000, 200000, null, now() - interval '1 day', now() + interval '60 days', null, 5)
on conflict (upper(code)) do update
  set description        = excluded.description,
      discount_type      = excluded.discount_type,
      discount_value     = excluded.discount_value,
      min_order_paisa    = excluded.min_order_paisa,
      max_discount_paisa = excluded.max_discount_paisa,
      starts_at          = excluded.starts_at,
      expires_at         = excluded.expires_at,
      usage_limit        = excluded.usage_limit,
      per_user_limit     = excluded.per_user_limit,
      is_active          = true;

-- ── Banners ─────────────────────────────────────────────────────────────────
-- Fixed UUIDs so re-running this file updates rather than duplicates.
insert into public.banners
  (id, placement, title, subtitle, eyebrow, image_url, mobile_image_url,
   cta_label, cta_href, secondary_cta_label, secondary_cta_href,
   accent_hex, priority, is_active)
values
  ('b1000000-0000-4000-8000-000000000001', 'hero',
   'The S24 Ultra, with official warranty',
   'Titanium frame, 200MP camera, and a Bangladesh warranty you can actually claim. In stock in all four colours.',
   'Samsung flagship',
   'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
   'Shop the S24 series', '/products?brand=samsung&category=smartphones',
   'Compare flagships', '/products?category=smartphones&sort=price_desc',
   '#1B4DFF', 100, true),
  ('b1000000-0000-4000-8000-000000000002', 'hero',
   'Laptops that survive a Dhaka summer',
   'Thermals we actually tested. Free 90-day setup support with every machine over ৳60,000.',
   'Work & study',
   'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
   'Browse laptops', '/products?category=laptops',
   null, null,
   '#0F766E', 90, true),
  ('b1000000-0000-4000-8000-000000000003', 'hero',
   'Sound worth the upgrade',
   'ANC headphones, earbuds and speakers — demo units available at our Panthapath counter.',
   'Audio',
   'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80',
   'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
   'Explore audio', '/products?category=audio',
   null, null,
   '#B45309', 80, true),
  ('b1000000-0000-4000-8000-000000000011', 'promo_strip',
   'Free delivery inside Dhaka on orders over ৳5,000',
   null, null, null, null, 'See delivery charges', '/delivery', null, null,
   '#111827', 10, true),
  ('b1000000-0000-4000-8000-000000000021', 'offer_card',
   'Cash on delivery, nationwide',
   'Pay the courier. No advance needed under ৳50,000.',
   'Zero risk', null, null, 'How it works', '/payments', null, null,
   '#1B4DFF', 30, true),
  ('b1000000-0000-4000-8000-000000000022', 'offer_card',
   '7-day replacement',
   'Dead pixel, DOA unit, wrong variant — we swap it, no argument.',
   'Warranty', null, null, 'Read the policy', '/returns', null, null,
   '#0F766E', 20, true),
  ('b1000000-0000-4000-8000-000000000023', 'offer_card',
   'Genuine stock only',
   'Every IMEI is verifiable. We do not sell refurbished units as new.',
   'Authenticity', null, null, 'Why it matters', '/authenticity', null, null,
   '#B45309', 10, true)
on conflict (id) do update
  set placement           = excluded.placement,
      title               = excluded.title,
      subtitle            = excluded.subtitle,
      eyebrow             = excluded.eyebrow,
      image_url           = excluded.image_url,
      mobile_image_url    = excluded.mobile_image_url,
      cta_label           = excluded.cta_label,
      cta_href            = excluded.cta_href,
      secondary_cta_label = excluded.secondary_cta_label,
      secondary_cta_href  = excluded.secondary_cta_href,
      accent_hex          = excluded.accent_hex,
      priority            = excluded.priority,
      is_active           = excluded.is_active;
