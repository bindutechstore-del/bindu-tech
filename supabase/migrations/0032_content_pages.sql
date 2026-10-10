-- ============================================================================
-- 0032  Editable information pages
-- ============================================================================
-- About, FAQ, shipping, returns, warranty, privacy, terms … ship as built-in
-- text in lib/content/pages.ts. The shop owner can now rewrite any of them
-- from admin → Pages: a coloured banner, headings, paragraphs, lists and
-- coloured notice boxes (warning, info, note, success). A row here replaces
-- that page's built-in text; deleting the row puts the built-in text back.
--
-- Public read (it is the public page), staff write. The admin action writes
-- with the service role after its own permission check; the staff policy is
-- the second line of defence. One row per page, so no index. Idempotent.

create table if not exists public.content_pages (
  slug         text primary key,
  title        text not null,
  subtitle     text,
  description  text,
  banner_color text,
  blocks       jsonb not null default '[]'::jsonb,
  updated_by   uuid references auth.users (id) on delete set null,
  updated_at   timestamptz not null default now(),

  constraint content_pages_slug      check (slug ~ '^[a-z0-9-]{1,60}$'),
  constraint content_pages_title_len check (char_length(title) between 1 and 160),
  constraint content_pages_sub_len   check (subtitle is null or char_length(subtitle) <= 600),
  constraint content_pages_desc_len  check (description is null or char_length(description) <= 300),
  constraint content_pages_color     check (banner_color is null or banner_color ~ '^#[0-9a-f]{6}$'),
  constraint content_pages_blocks    check (jsonb_typeof(blocks) = 'array' and pg_column_size(blocks) <= 300000)
);

alter table public.content_pages enable row level security;

drop policy if exists content_pages_read on public.content_pages;
create policy content_pages_read on public.content_pages
  for select to anon, authenticated
  using (true);

drop policy if exists content_pages_staff on public.content_pages;
create policy content_pages_staff on public.content_pages
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop trigger if exists set_updated_at on public.content_pages;
create trigger set_updated_at before update on public.content_pages
  for each row execute function public.tg_set_updated_at();
