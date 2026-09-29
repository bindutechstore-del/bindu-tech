-- ============================================================================
-- 0028  Product requests
-- ============================================================================
-- "Request a Product" in the menu: a shopper asks for something the shop does
-- not stock, and staff see it in admin → Product requests.
--
-- Nobody but staff can read or change these rows — they hold a stranger's
-- name, email and phone. Shoppers never insert directly: the request goes
-- through a server action that validates it, rate-limits it and writes with
-- the service role, so there is deliberately no public insert policy.
--
-- No index: a few requests a day, read newest-first by staff. Idempotent.

create table if not exists public.product_requests (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users (id) on delete set null,
  name                 text not null,
  email                text not null,
  phone                text,
  quantity             integer not null default 1,
  product_name         text not null,
  description          text,
  expected_price_paisa integer,
  status               text not null default 'new',
  admin_note           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint product_requests_name_len    check (char_length(name) between 1 and 80),
  constraint product_requests_email_len   check (char_length(email) between 3 and 160),
  constraint product_requests_phone_len   check (phone is null or char_length(phone) <= 20),
  constraint product_requests_quantity    check (quantity between 1 and 1000),
  constraint product_requests_product_len check (char_length(product_name) between 2 and 160),
  constraint product_requests_desc_len    check (description is null or char_length(description) <= 1000),
  constraint product_requests_price       check (expected_price_paisa is null or expected_price_paisa between 0 and 100000000),
  constraint product_requests_status      check (status in ('new', 'contacted', 'sourced', 'closed')),
  constraint product_requests_note_len    check (admin_note is null or char_length(admin_note) <= 500)
);

alter table public.product_requests enable row level security;

drop policy if exists product_requests_staff on public.product_requests;
create policy product_requests_staff on public.product_requests
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop trigger if exists set_updated_at on public.product_requests;
create trigger set_updated_at before update on public.product_requests
  for each row execute function public.tg_set_updated_at();
