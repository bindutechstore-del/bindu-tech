import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, requireAdmin, requirePermission } from "@/lib/auth/session";
import type { AppRole, Order, OrderStatus } from "@/types/database";
import { MANUAL_KEY_PREFIX } from "@/lib/payments/manual";

/**
 * Admin reads.
 *
 * These use the SERVICE-ROLE client, which bypasses RLS — that is the only way
 * to read `products.cost_paisa` (revoked at the column level in migration 0011)
 * and therefore the only way to compute margin.
 *
 * Every exported function calls `requireStaff()` FIRST. An unguarded
 * service-role query is a data breach, not a bug.
 */

export interface DashboardStats {
  todayRevenuePaisa: number;
  todayOrders: number;
  monthRevenuePaisa: number;
  monthOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalCustomers: number;
  lowStockCount: number;
  pendingReviews: number;
}

/**
 * Counts and revenue for the KPI tiles.
 *
 * Margin deliberately lives in `getMonthlyMargin` instead: it is the only
 * figure here that needs a scan of `order_items`, and holding the eight cheap
 * tiles hostage to it made the whole dashboard feel slow. They now render on
 * their own Suspense boundaries.
 */
export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  await requireStaff();
  const db = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, month, pending, delivered, customers, lowStock, reviews] =
    await Promise.all([
      db
        .from("orders")
        .select("total_paisa")
        .gte("placed_at", todayStart.toISOString())
        .not("status", "in", "(cancelled,returned)"),
      db
        .from("orders")
        .select("total_paisa, subtotal_paisa, discount_paisa")
        .gte("placed_at", monthStart.toISOString())
        .not("status", "in", "(cancelled,returned)"),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["placed", "confirmed", "processing"]),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered"),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db
        .from("products")
        .select("id", { count: "exact", head: true })
        .neq("status", "archived")
        .lte("stock", 5),
      db
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  const todayRows = today.data ?? [];
  const monthRows = month.data ?? [];

  return {
    todayRevenuePaisa: todayRows.reduce((s, o) => s + (o.total_paisa ?? 0), 0),
    todayOrders: todayRows.length,
    monthRevenuePaisa: monthRows.reduce((s, o) => s + (o.total_paisa ?? 0), 0),
    monthOrders: monthRows.length,
    pendingOrders: pending.count ?? 0,
    deliveredOrders: delivered.count ?? 0,
    totalCustomers: customers.count ?? 0,
    lowStockCount: lowStock.count ?? 0,
    pendingReviews: reviews.count ?? 0,
  };
});

/** How many order lines one margin calculation will read. */
const MARGIN_LINE_CAP = 5000;

export interface MonthlyMargin {
  grossMarginPaisa: number;
  /** True when the month exceeded the cap and the figure is partial. */
  truncated: boolean;
  /**
   * Lines left out because their product was deleted: order lines keep the
   * price they sold at but not the cost, so counting them would add their
   * whole revenue to the margin.
   */
  excludedLines: number;
}

/**
 * Gross margin for the current month.
 *
 * Margin needs `cost_paisa`, which is revoked at the column level and readable
 * only by the service role, so it cannot be done in a view the storefront
 * shares. It is the one dashboard figure that scans `order_items`, which is
 * why it is bounded: an unbounded month would pull every line into a 1 GB
 * function and the dashboard would die exactly when the shop is busiest.
 * Past the cap the number is reported as partial rather than quietly wrong.
 */
export const getMonthlyMargin = cache(async (): Promise<MonthlyMargin> => {
  await requireStaff();
  const db = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: soldLines } = await db
    .from("order_items")
    .select("product_id, quantity, line_total_paisa, orders!inner(placed_at, status)")
    .gte("orders.placed_at", monthStart.toISOString())
    .not("orders.status", "in", "(cancelled,returned)")
    .limit(MARGIN_LINE_CAP);

  const lines = (soldLines ?? []) as unknown as {
    product_id: string | null;
    quantity: number;
    line_total_paisa: number;
  }[];

  const productIds = [...new Set(lines.map((l) => l.product_id).filter(Boolean))];
  const { data: costs } = productIds.length
    ? await db.from("products").select("id, cost_paisa").in("id", productIds)
    : { data: [] };

  const costById = new Map(
    ((costs ?? []) as { id: string; cost_paisa: number | null }[]).map((c) => [
      c.id,
      c.cost_paisa ?? 0,
    ]),
  );

  let excludedLines = 0;
  const grossMarginPaisa = lines.reduce((sum, l) => {
    if (!l.product_id || !costById.has(l.product_id)) {
      excludedLines += 1;
      return sum;
    }
    const cost = (costById.get(l.product_id) ?? 0) * l.quantity;
    return sum + (l.line_total_paisa - cost);
  }, 0);

  return { grossMarginPaisa, truncated: lines.length >= MARGIN_LINE_CAP, excludedLines };
});

/** Daily revenue for the dashboard chart. Bounded by design — 30 points max. */
export async function getRevenueSeries(days = 30) {
  await requireStaff();
  const db = createAdminClient();

  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const { data } = await db
    .from("orders")
    .select("placed_at, total_paisa")
    .gte("placed_at", from.toISOString())
    .not("status", "in", "(cancelled,returned)")
    .order("placed_at");

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i <= days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }

  for (const row of data ?? []) {
    const key = String(row.placed_at).slice(0, 10);
    const entry = byDay.get(key);
    if (entry) {
      entry.revenue += row.total_paisa ?? 0;
      entry.orders += 1;
    }
  }

  return [...byDay.entries()].map(([date, v]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    revenue: v.revenue / 100,
    orders: v.orders,
  }));
}

export async function getBestSellers(limit = 8) {
  await requireStaff();
  const db = createAdminClient();

  const { data } = await db
    .from("products")
    .select("id, name, slug, units_sold, price_paisa, cost_paisa, stock, thumbnail_url")
    .gt("units_sold", 0)
    .order("units_sold", { ascending: false })
    .limit(limit);

  return (data ?? []) as {
    id: string;
    name: string;
    slug: string;
    units_sold: number;
    price_paisa: number;
    cost_paisa: number | null;
    stock: number;
    thumbnail_url: string | null;
  }[];
}

export async function getLowStock(limit = 20) {
  await requireStaff();
  const db = createAdminClient();

  const { data } = await db
    .from("products")
    .select("id, name, slug, stock, low_stock_threshold, status, sku, thumbnail_url")
    .neq("status", "archived")
    .order("stock", { ascending: true })
    .limit(limit);

  return (data ?? []) as {
    id: string;
    name: string;
    slug: string;
    stock: number;
    low_stock_threshold: number;
    status: string;
    sku: string;
    thumbnail_url: string | null;
  }[];
}

export interface AdminOrderRow extends Order {
  item_count: number;
}

export async function listAdminOrders(filter: {
  status?: OrderStatus | "all";
  q?: string;
  limit?: number;
}) {
  await requireStaff();
  const db = createAdminClient();

  let query = db
    .from("orders")
    .select("*")
    .order("placed_at", { ascending: false })
    .limit(filter.limit ?? 100);

  if (filter.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }
  if (filter.q) {
    // Support looks orders up by number or phone, and both are indexed.
    query = query.or(
      `order_number.ilike.%${filter.q}%,customer_phone.ilike.%${filter.q}%,customer_name.ilike.%${filter.q}%`,
    );
  }

  const { data } = await query;
  const orders = (data ?? []) as Order[];

  const { data: counts } = orders.length
    ? await db
        .from("order_items")
        .select("order_id, quantity")
        .in("order_id", orders.map((o) => o.id))
    : { data: [] };

  const byOrder = new Map<string, number>();
  for (const c of (counts ?? []) as { order_id: string; quantity: number }[]) {
    byOrder.set(c.order_id, (byOrder.get(c.order_id) ?? 0) + c.quantity);
  }

  return orders.map((o) => ({ ...o, item_count: byOrder.get(o.id) ?? 0 }));
}

// ── Manual payment verification ─────────────────────────────────────────────

export interface ManualPaymentRow {
  id: string;
  order_id: string;
  provider: string;
  status: string;
  amount_paisa: number;
  provider_txn_id: string | null;
  sender_msisdn: string | null;
  screenshot_path: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_status: string;
  verified_by_name: string | null;
}

/**
 * Manual bKash/Nagad submissions, newest first.
 *
 * `pendingOnly` drives the verification queue; the full list is the audit
 * trail of what was approved or rejected and by whom.
 */
export async function listManualPayments(
  pendingOnly = false,
): Promise<ManualPaymentRow[]> {
  await requireStaff();
  const db = createAdminClient();

  // A manual submission is identified by the shape of its idempotency_key —
  // see lib/payments/manual.ts for why that column carries the marker.
  let q = db
    .from("payments")
    .select(
      "id, order_id, provider, status, amount_paisa, provider_txn_id, " +
        "idempotency_key, settled_at, failure_reason, created_at",
    )
    .like("idempotency_key", `${MANUAL_KEY_PREFIX}%`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (pendingOnly) q = q.in("status", ["initiated", "pending"]);

  const { data, error } = await q;
  if (error) return [];

  const rows = (data ?? []) as unknown as {
    id: string;
    order_id: string;
    provider: string;
    status: string;
    amount_paisa: number;
    provider_txn_id: string | null;
    idempotency_key: string | null;
    settled_at: string | null;
    failure_reason: string | null;
    created_at: string;
  }[];

  if (rows.length === 0) return [];

  // The sender number, the screenshot and who decided live in the transaction
  // log, because `payments` has no columns for them.
  const [{ data: orders }, { data: events }] = await Promise.all([
    db
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, status")
      .in("id", rows.map((r) => r.order_id)),
    db
      .from("payment_transactions")
      .select("payment_id, event, payload, created_at")
      .in("payment_id", rows.map((r) => r.id))
      .in("event", ["manual_submit", "manual_approve", "manual_reject"])
      .order("created_at", { ascending: false }),
  ]);

  const orderById = new Map(
    ((orders ?? []) as {
      id: string;
      order_number: string;
      customer_name: string;
      customer_phone: string;
      status: string;
    }[]).map((o) => [o.id, o]),
  );

  type Evt = {
    payment_id: string;
    event: string;
    payload: Record<string, unknown> | null;
    created_at: string;
  };
  const submitByPayment = new Map<string, Evt>();
  const decisionByPayment = new Map<string, Evt>();
  // Ordered newest-first, so the first of each kind we see is the latest.
  for (const e of ((events ?? []) as Evt[])) {
    if (e.event === "manual_submit") {
      if (!submitByPayment.has(e.payment_id)) submitByPayment.set(e.payment_id, e);
    } else if (!decisionByPayment.has(e.payment_id)) {
      decisionByPayment.set(e.payment_id, e);
    }
  }

  const str = (v: unknown) => (typeof v === "string" ? v : null);

  return rows.map((r) => {
    const o = orderById.get(r.order_id);
    const submit = submitByPayment.get(r.id);
    const decision = decisionByPayment.get(r.id);

    return {
      id: r.id,
      order_id: r.order_id,
      provider: r.provider,
      status: r.status,
      amount_paisa: r.amount_paisa,
      provider_txn_id: r.provider_txn_id,
      sender_msisdn: str(submit?.payload?.sender_msisdn),
      screenshot_path: str(submit?.payload?.screenshot_path),
      submitted_at: str(submit?.payload?.submitted_at) ?? submit?.created_at ?? null,
      verified_at: str(decision?.payload?.verified_at) ?? r.settled_at,
      rejection_reason: r.failure_reason,
      order_number: o?.order_number ?? "—",
      customer_name: o?.customer_name ?? "—",
      customer_phone: o?.customer_phone ?? "",
      order_status: o?.status ?? "",
      verified_by_name: str(decision?.payload?.verified_by_name),
    };
  });
}

/** Badge count for the admin nav. */
export async function countPendingManualPayments(): Promise<number> {
  const db = createAdminClient();
  const { count, error } = await db
    .from("payments")
    .select("id", { count: "exact", head: true })
    .like("idempotency_key", `${MANUAL_KEY_PREFIX}%`)
    .in("status", ["initiated", "pending"]);

  return error ? 0 : (count ?? 0);
}

// ── Staff ───────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole;
  permissions: string[];
  created_at: string;
}

/** Everyone with an admin or manager role, plus each manager's grants. */
export async function listStaff(): Promise<StaffMember[]> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: roles } = await db
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "manager"]);

  const rows = (roles ?? []) as { user_id: string; role: AppRole }[];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.user_id))];

  const [{ data: profiles }, grants] = await Promise.all([
    db.from("profiles").select("id, full_name, email, phone, created_at").in("id", ids),
    // Absent until migration 0015 — an error here means "no grants recorded",
    // not "no staff".
    db.from("staff_permissions").select("user_id, permission").in("user_id", ids),
  ]);

  const permsByUser = new Map<string, string[]>();
  for (const g of ((grants.data ?? []) as { user_id: string; permission: string }[])) {
    permsByUser.set(g.user_id, [...(permsByUser.get(g.user_id) ?? []), g.permission]);
  }

  // Highest role wins, matching my_role().
  const RANK: Record<AppRole, number> = { customer: 1, manager: 2, admin: 3 };
  const roleByUser = new Map<string, AppRole>();
  for (const r of rows) {
    const cur = roleByUser.get(r.user_id);
    if (!cur || RANK[r.role] > RANK[cur]) roleByUser.set(r.user_id, r.role);
  }

  return ((profiles ?? []) as {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
  }[])
    .map((p) => ({
      ...p,
      role: roleByUser.get(p.id) ?? "manager",
      permissions: permsByUser.get(p.id) ?? [],
    }))
    .sort((a, b) => (a.role === "admin" ? -1 : b.role === "admin" ? 1 : 0));
}

/** Rows per page for the admin tables. */
export const ADMIN_PAGE_SIZE = 30;

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price_paisa: number;
  compare_at_paisa: number | null;
  cost_paisa: number | null;
  stock: number;
  status: "draft" | "active" | "archived";
  thumbnail_url: string | null;
  units_sold: number;
  low_stock_threshold: number;
  category_id: string | null;
}

/**
 * One page of the admin product table.
 *
 * Was a flat `.limit(200)`: every visit to /admin/products rendered two
 * hundred rows with images and margin columns, whether or not anyone scrolled
 * past the first ten. Now the page ships 30 and the rest load on scroll.
 */
export const listAdminProducts = cache(
  async (filter: { q?: string; status?: string; page?: number }) => {
    await requirePermission("products");
    const db = createAdminClient();

    const page = Math.max(1, Math.min(500, filter.page ?? 1));
    const from = (page - 1) * ADMIN_PAGE_SIZE;

    let query = db
      .from("products")
      .select(
        "id, name, slug, sku, price_paisa, compare_at_paisa, cost_paisa, stock, status, thumbnail_url, units_sold, low_stock_threshold, category_id",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (filter.status && filter.status !== "all") {
      query = query.eq("status", filter.status);
    }
    if (filter.q) {
      // Escape the PostgREST `or` metacharacters — a name containing a comma
      // or a parenthesis would otherwise be parsed as more filter syntax.
      const term = filter.q.replace(/[,()\\]/g, "\\$&");
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
    }

    const { data, count } = await query.range(from, from + ADMIN_PAGE_SIZE - 1);
    const rows = (data ?? []) as unknown as AdminProductRow[];
    const total = count ?? rows.length;

    return {
      rows,
      total,
      page,
      nextPage: from + rows.length < total ? page + 1 : null,
    };
  },
);

/** Category id → name, for the admin tables. Small, and cached per request. */
export const getCategoryNames = cache(async (): Promise<Map<string, string>> => {
  await requireStaff();
  const db = createAdminClient();
  const { data } = await db.from("categories").select("id, name");
  return new Map(
    ((data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
  );
});

export interface AdminCustomerRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  marketing_opt_in: boolean;
  role: AppRole;
  orderCount: number;
  spendPaisa: number;
}

/**
 * One page of the admin customer table, with each customer's order tally.
 *
 * The order lookup is the reason this is paginated rather than capped at 200
 * profiles: it fans out to every order those customers ever placed, with no
 * limit of its own. Two hundred repeat buyers was already thousands of rows
 * held in a function to produce two numbers per row. Thirty at a time keeps
 * the fan-out proportional to what is actually on screen.
 */
export const listAdminCustomers = cache(
  async (filter: { q?: string; page?: number }) => {
    const staff = await requirePermission("customers");
    const db = createAdminClient();

    const page = Math.max(1, Math.min(500, filter.page ?? 1));
    const from = (page - 1) * ADMIN_PAGE_SIZE;

    let query = db
      .from("profiles")
      .select("id, full_name, email, phone, created_at, marketing_opt_in", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (filter.q) {
      const term = filter.q.replace(/[,()\\]/g, "\\$&");
      query = query.or(
        `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
      );
    }

    const { data, count } = await query.range(from, from + ADMIN_PAGE_SIZE - 1);
    const profiles = (data ?? []) as {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      created_at: string;
      marketing_opt_in: boolean;
    }[];

    if (profiles.length === 0) {
      return { rows: [] as AdminCustomerRow[], total: count ?? 0, page, nextPage: null, staff };
    }

    const ids = profiles.map((p) => p.id);
    const [{ data: roles }, { data: orders }] = await Promise.all([
      db.from("user_roles").select("user_id, role").in("user_id", ids),
      db.from("orders").select("user_id, total_paisa, status").in("user_id", ids),
    ]);

    // Highest role wins, matching my_role() in migration 0007.
    const RANK: Record<AppRole, number> = { customer: 1, manager: 2, admin: 3 };
    const roleByUser = new Map<string, AppRole>();
    for (const r of (roles ?? []) as { user_id: string; role: AppRole }[]) {
      const current = roleByUser.get(r.user_id);
      if (!current || RANK[r.role] > RANK[current]) roleByUser.set(r.user_id, r.role);
    }

    const statsByUser = new Map<string, { count: number; spend: number }>();
    for (const o of (orders ?? []) as {
      user_id: string | null;
      total_paisa: number;
      status: string;
    }[]) {
      if (!o.user_id || o.status === "cancelled" || o.status === "returned") continue;
      const s = statsByUser.get(o.user_id) ?? { count: 0, spend: 0 };
      s.count += 1;
      s.spend += o.total_paisa;
      statsByUser.set(o.user_id, s);
    }

    const total = count ?? profiles.length;
    return {
      rows: profiles.map((p) => ({
        ...p,
        role: roleByUser.get(p.id) ?? ("customer" as AppRole),
        orderCount: statsByUser.get(p.id)?.count ?? 0,
        spendPaisa: statsByUser.get(p.id)?.spend ?? 0,
      })),
      total,
      page,
      nextPage: from + profiles.length < total ? page + 1 : null,
      staff,
    };
  },
);
