-- ============================================================================
-- 0034  Sizes and options (fashion)
-- ============================================================================
-- Products can now be sold in sizes (S, M, L, XL …) and colours, managed from
-- the product form. The storage already existed — product_variants, with
-- per-variant stock, an optional price, and the cart / quote / order path
-- carrying variant_id — so this migration only closes the gaps:
--
--   1. products.has_variants, so listings know a product needs a size chosen
--      (the card shows "Choose size" instead of a quick Add to cart). Kept
--      current by the stock-sync trigger that already sums variant stock.
--   2. cart_add_item refuses a product that has active options when none is
--      chosen: such a line would become an order nobody could pack.
--
-- Idempotent.

alter table public.products
  add column if not exists has_variants boolean not null default false;

-- products has column-level SELECT grants (0024 keeps cost_paisa private).
grant select (has_variants) on public.products to anon, authenticated;

-- Keep products.stock as the sum of active variant stock for products that
-- have variants, and products.has_variants as "has at least one active one".
-- Single-SKU products manage products.stock directly.
create or replace function public.tg_sync_product_stock()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
  v_any boolean;
  v_active boolean;
begin
  select exists (select 1 from public.product_variants v where v.product_id = v_product),
         exists (select 1 from public.product_variants v where v.product_id = v_product and v.is_active)
    into v_any, v_active;

  update public.products p
     set stock = case
           when v_any then coalesce((
             select sum(v.stock) from public.product_variants v
             where v.product_id = v_product and v.is_active
           ), 0)
           else p.stock
         end,
         has_variants = v_active
   where p.id = v_product
     and (v_any or p.has_variants);
  return null;
end;
$$;

update public.products p
   set has_variants = exists (
     select 1 from public.product_variants v where v.product_id = p.id and v.is_active
   )
 where has_variants is distinct from exists (
     select 1 from public.product_variants v where v.product_id = p.id and v.is_active
   );

create or replace function public.cart_add_item(
  p_cart_id uuid,
  p_product_id uuid,
  p_variant_id uuid default null,
  p_quantity integer default 1,
  p_guest_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_qty integer := greatest(1, least(coalesce(p_quantity, 1), 99));
  v_available integer;
  v_existing integer := 0;
begin
  perform public.assert_cart_access(p_cart_id, p_guest_token);

  -- The product must be purchasable. Checked here so an inactive product can
  -- never enter a cart in the first place.
  if not exists (
    select 1 from public.products where id = p_product_id and status = 'active'
  ) then
    raise exception 'product_unavailable' using errcode = 'P0001';
  end if;

  -- A product sold in sizes or options needs one chosen (0034).
  if p_variant_id is null and exists (
    select 1 from public.product_variants v
    where v.product_id = p_product_id and v.is_active
  ) then
    raise exception 'variant_required' using errcode = 'P0001';
  end if;

  if p_variant_id is not null then
    select v.stock into v_available from public.product_variants v
    where v.id = p_variant_id and v.product_id = p_product_id and v.is_active;
    if v_available is null then
      raise exception 'variant_unavailable' using errcode = 'P0001';
    end if;
  else
    select p.stock into v_available from public.products p where p.id = p_product_id;
  end if;

  select coalesce(quantity, 0) into v_existing
  from public.cart_items
  where cart_id = p_cart_id
    and product_id = p_product_id
    and coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = coalesce(p_variant_id, '00000000-0000-0000-0000-000000000000'::uuid);

  if coalesce(v_available, 0) <= 0 then
    raise exception 'out_of_stock' using errcode = 'P0001';
  end if;

  -- Clamp instead of failing: adding a 3rd unit when 2 are left should leave
  -- the customer with 2 in the cart and a message, not an error page.
  v_qty := least(v_qty + coalesce(v_existing, 0), v_available, 99);

  insert into public.cart_items (cart_id, product_id, variant_id, quantity)
  values (p_cart_id, p_product_id, p_variant_id, v_qty)
  on conflict (cart_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set quantity = v_qty;

  return jsonb_build_object('quantity', v_qty, 'clamped', v_qty < (coalesce(v_existing, 0) + greatest(1, least(coalesce(p_quantity, 1), 99))));
end;
$$;
