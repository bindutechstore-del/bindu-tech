/**
 * Hand-maintained mirror of `supabase/migrations/*.sql`.
 *
 * Rule: if you add a column in a migration, add it here in the same commit.
 * `npm run db:types` can replace this file once the Supabase CLI is linked, but
 * the shapes below are the contract the app compiles against today.
 *
 * Money is ALWAYS integer paisa. 1 BDT = 100 paisa. Never a float, never a
 * string. Formatting happens exactly once, in lib/utils/money.ts.
 */

export type AppRole = "customer" | "manager" | "admin";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus =
  | "initiated"
  | "pending"
  | "successful"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentMethod = "cod" | "bkash" | "nagad" | "card" | "other";
export type DiscountType = "percentage" | "fixed";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type ProductStatus = "draft" | "active" | "archived";
export type BannerPlacement = "hero" | "promo_strip" | "category_tile" | "offer_card";

/** One row of the PDP spec table. */
export interface SpecItem {
  label: string;
  value: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  email: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  district: string;
  area: string;
  street: string;
  postcode: string | null;
  landmark: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  position: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  /** A few lines about the maker, shown on its brand page (0027). */
  description: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * `cost_paisa` is deliberately absent. Migration 0011 revokes column SELECT for
 * anon/authenticated, so a client query naming it fails outright. Admin reads it
 * through the service-role client — see `ProductAdmin`.
 */
export interface Product {
  id: string;
  category_id: string | null;
  brand_id: string | null;
  name: string;
  slug: string;
  sku: string;
  short_description: string | null;
  description: string | null;
  specifications: SpecItem[];
  features: string[];
  warranty: string | null;
  delivery_note: string | null;
  price_paisa: number;
  compare_at_paisa: number | null;
  stock: number;
  low_stock_threshold: number;
  /** Points a purchase of one unit earns, once the order is delivered. */
  points_per_purchase: number;
  status: ProductStatus;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  thumbnail_url: string | null;
  video_url: string | null;
  rating_sum: number;
  rating_count: number;
  units_sold: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Service-role shape only. Never returned to the browser. */
export interface ProductAdmin extends Product {
  cost_paisa: number | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price_paisa: number | null;
  compare_at_paisa: number | null;
  stock: number;
  image_url: string | null;
  attributes: Record<string, string>;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  position: number;
  created_at: string;
}

export interface ProductAttribute {
  id: string;
  product_id: string;
  name: string;
  value: string;
  created_at: string;
}

export interface Cart {
  id: string;
  user_id: string | null;
  guest_token: string | null;
  coupon_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  slug: string;
  fee_paisa: number;
  free_above_paisa: number | null;
  min_days: number;
  max_days: number;
  districts: string[];
  is_fallback: boolean;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_paisa: number;
  max_discount_paisa: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  per_user_limit: number;
  used_count: number;
  product_ids: string[];
  category_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashSale {
  id: string;
  title: string;
  subtitle: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashSaleItem {
  id: string;
  flash_sale_id: string;
  product_id: string;
  sale_price_paisa: number;
  stock_limit: number | null;
  sold_count: number;
  position: number;
}

export interface Banner {
  id: string;
  placement: BannerPlacement;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  secondary_cta_label: string | null;
  secondary_cta_href: string | null;
  accent_hex: string | null;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  shipping_district: string;
  shipping_area: string;
  shipping_street: string;
  shipping_postcode: string | null;
  shipping_landmark: string | null;
  address_id: string | null;
  status: OrderStatus;
  delivery_zone_id: string | null;
  delivery_zone_name: string;
  delivery_min_days: number;
  delivery_max_days: number;
  subtotal_paisa: number;
  discount_paisa: number;
  delivery_fee_paisa: number;
  total_paisa: number;
  coupon_id: string | null;
  coupon_code: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  customer_note: string | null;
  internal_note: string | null;
  placed_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string;
  image_url: string | null;
  unit_price_paisa: number;
  quantity: number;
  line_total_paisa: number;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: PaymentMethod;
  status: PaymentStatus;
  amount_paisa: number;
  currency: string;
  provider_ref: string | null;
  provider_txn_id: string | null;
  failure_reason: string | null;
  idempotency_key: string | null;
  initiated_at: string;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  status: ReviewStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: unknown;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface AuditLogEntry {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
  created_at: string;
}
