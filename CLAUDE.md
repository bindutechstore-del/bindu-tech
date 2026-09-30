# Nazmul Commerce — agent handover brief

Bangladesh electronics/gadgets storefront + admin. Next.js 16 App Router,
TypeScript, Tailwind v4, Supabase (Postgres 17 + Auth + Storage + RLS).

**Read [PROJECT_GRAPH.md](PROJECT_GRAPH.md) first.** It is the authoritative map
of modules, data flow, invariants and current phase status. This file is the
short version.

## Ground rules that are not optional

1. **Money is computed in Postgres, never in React.** The single source of
   truth for a cart total is the `quote_cart()` SQL function
   (`supabase/migrations/0011_pricing.sql`). Client code may *display* a price;
   it may never *submit* one. Order creation re-quotes server-side and ignores
   any price in the request payload.
2. **RLS is the security boundary**, not the router. Every table has policies.
   Middleware redirects are UX, not authorization. Admin checks use the
   `is_staff()` / `has_role()` SQL helpers which are `SECURITY DEFINER` and read
   `user_roles` — never a client-supplied role claim.
3. **`auth.uid()` inside a policy must be wrapped** as `(select auth.uid())`.
   Postgres then treats it as an InitPlan and evaluates it once per query
   instead of once per row. This is the difference between a 4 ms and a 900 ms
   product listing on the free tier.
4. **Free-tier RAM budget ≈ 1 GB.** See "Database RAM discipline" in
   PROJECT_GRAPH.md before adding an index, a trigger, a realtime subscription,
   or a `select *`. One GIN index exists (`products.search_vector`); do not add
   per-column trigram indexes.
5. **Never introduce a payment provider branch outside `lib/payments/`.**
   Checkout talks to the `PaymentProvider` interface only.
6. **No placeholder UI.** Every button either performs a real mutation or is not
   rendered. If a feature is env-gated (bKash without credentials), it is hidden
   or disabled with a reason, not faked.

## Commands

```bash
npm run dev        # next dev
npm run typecheck  # tsc --noEmit  ← run before claiming done
npm run test       # vitest (pricing/coupon/delivery unit tests)
npm run build      # production build
npm run verify     # typecheck + test + build
```

## Supabase

Project ref `padfvqjdmtcmowajqrhu`, region ap-northeast-2. Migrations are plain
SQL in `supabase/migrations/`, applied in filename order. They are idempotent —
re-running is safe. Apply with `scripts/db-apply.mjs` (uses the management PAT
in `SUPABASE_ACCESS_TOKEN`) or paste into the SQL editor.

Admin bootstrap: sign up through the UI, then
`node scripts/make-admin.mjs you@example.com`.

## Layout

```
app/(storefront)   public shop     app/(auth)  sign-in/up      app/admin  back office
app/api            webhooks + payment callbacks only
components/{ui,storefront,product,cart,checkout,account,admin}
lib/{supabase,payments,pricing,auth,validations,queries,utils}
supabase/migrations  schema, RLS, functions, seed
```

Business logic lives in `lib/`, never inside a page component.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
