-- ============================================================================
-- 0030  payment-proofs bucket
-- ============================================================================
-- The one private bucket: bKash / Nagad payment screenshots, which show a
-- wallet balance and a phone number. It was first created by hand in the
-- dashboard; this makes a fresh project complete from migrations alone.
--
-- Deliberately no storage policies: uploads go through a server action with
-- the service role after the order number + phone pair is checked, and staff
-- read through short-lived signed URLs. Idempotent.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
