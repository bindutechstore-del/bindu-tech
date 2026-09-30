-- ============================================================================
-- 0029  Partner applications
-- ============================================================================
-- "Become a partner" (/be-partner): a shop, company or creator applies, and
-- staff see it in admin → Partners.
--
-- Staff read and change every row. An applicant with an account may read
-- their own rows, so the page can show "we have your application" instead of
-- the form again. Nobody inserts directly: the application goes through a
-- server action that validates it, rate-limits it and writes with the service
-- role, so there is deliberately no insert policy.
--
-- No index: a handful of rows, read newest-first by staff. Idempotent.

create table if not exists public.partner_applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete set null,
  store_name     text not null,
  first_name     text not null,
  last_name      text not null,
  email          text not null,
  phone          text,
  partner_type   text not null default 'retail',
  city           text,
  message        text,
  status         text not null default 'new',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint partner_applications_store_len  check (char_length(store_name) between 2 and 120),
  constraint partner_applications_first_len  check (char_length(first_name) between 1 and 60),
  constraint partner_applications_last_len   check (char_length(last_name) between 1 and 60),
  constraint partner_applications_email_len  check (char_length(email) between 3 and 160),
  constraint partner_applications_phone_len  check (phone is null or char_length(phone) <= 20),
  constraint partner_applications_type       check (partner_type in ('retail', 'corporate', 'affiliate', 'other')),
  constraint partner_applications_city_len   check (city is null or char_length(city) <= 80),
  constraint partner_applications_msg_len    check (message is null or char_length(message) <= 1000),
  constraint partner_applications_status     check (status in ('new', 'contacted', 'approved', 'rejected'))
);

alter table public.partner_applications enable row level security;

drop policy if exists partner_applications_staff on public.partner_applications;
create policy partner_applications_staff on public.partner_applications
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists partner_applications_own_read on public.partner_applications;
create policy partner_applications_own_read on public.partner_applications
  for select to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on public.partner_applications;
create trigger set_updated_at before update on public.partner_applications
  for each row execute function public.tg_set_updated_at();
