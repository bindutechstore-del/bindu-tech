-- ============================================================================
-- 0031  Per-product warranty / replacement switches
-- ============================================================================
-- The product page always showed "Official warranty" and "7-day replacement".
-- Not every product carries a warranty, so each line can now be hidden per
-- product from the product form. Both default to shown, so existing products
-- look exactly as before until someone unticks them.
--
-- products has column-level SELECT grants (0024 keeps cost_paisa private), so
-- new columns are invisible to the storefront until granted. Idempotent.

alter table public.products
  add column if not exists show_warranty    boolean not null default true,
  add column if not exists show_replacement boolean not null default true;

grant select (show_warranty, show_replacement) on public.products to anon, authenticated;
