-- ============================================================================
-- 0033  Information pages: "each section in its own box"
-- ============================================================================
-- A page-level layout switch from admin → Pages: when on, every Title and the
-- blocks under it are drawn as a separate card. Off keeps the single column
-- every page had before. Idempotent.

alter table public.content_pages
  add column if not exists boxed boolean not null default false;
