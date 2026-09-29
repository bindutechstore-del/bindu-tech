-- ============================================================================
-- 0027  Brand descriptions
-- ============================================================================
-- Each brand now has its own page (/brands/<slug>): logo, a few lines about
-- the maker, then its products — the layout the client pointed to. The text
-- is admin-written, so it lives on the row. Capped so a pasted essay cannot
-- bloat every brand listing.
--
-- brands has no column-level grants (only products does, see 0011/0024), so
-- a new column is readable wherever the row already is. Idempotent.

alter table public.brands add column if not exists description text;

alter table public.brands drop constraint if exists brands_description_length;
alter table public.brands add constraint brands_description_length
  check (description is null or char_length(description) <= 2000);
