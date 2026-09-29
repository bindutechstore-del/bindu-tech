-- ============================================================================
-- 0026  Customer profile pictures
-- ============================================================================
-- The menu drawer greets a signed-in customer with their picture, and the
-- account page lets them upload one. profiles.avatar_url has existed since
-- 0002; what was missing was somewhere a CUSTOMER may upload to — the
-- catalogue buckets are staff-only.
--
-- Same shape as review photos in 0012: each user may write only inside a
-- folder named after their own id, so nobody can replace someone else's
-- picture. Small (1 MB) — the uploader shrinks to 400 px.
--
-- The bucket is public, so a picture's URL opens for anyone who has it. But
-- LISTING is owner-only: a public select policy would let any visitor with
-- the anon key list every folder — every customer's id and photo.
--
-- Idempotent.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.drop_storage_policy_if_exists(p_policy text)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on storage.objects', p_policy);
end $$;

select public.drop_storage_policy_if_exists('bidyut_avatar_read');
create policy bidyut_avatar_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

select public.drop_storage_policy_if_exists('bidyut_avatar_insert');
create policy bidyut_avatar_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

select public.drop_storage_policy_if_exists('bidyut_avatar_update');
create policy bidyut_avatar_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

select public.drop_storage_policy_if_exists('bidyut_avatar_delete');
create policy bidyut_avatar_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop function if exists public.drop_storage_policy_if_exists(text);

-- ── What profiles.avatar_url may hold ───────────────────────────────────────
-- profiles_update_own (0011) lets a customer update their own row directly
-- through the API, so the app's check alone is not a boundary. The picture
-- must be a file in THEIR OWN avatars folder on a Supabase host — never
-- someone else's picture, never an outside link, no "..", "%", "?" or "#".
alter table public.profiles drop constraint if exists profiles_avatar_own_folder;
alter table public.profiles add constraint profiles_avatar_own_folder check (
  avatar_url is null
  or avatar_url ~ (
    '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/'
    || id::text
    || '/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.(webp|jpg|jpeg|png)$'
  )
);
