"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Ticket,
  Image as ImageIcon,
  Star,
  Truck,
  BarChart3,
  Settings,
  Palette,
  Layers,
  Menu,
  X,
  CreditCard,
  ShieldCheck,
  Tag,
  PackagePlus,
} from "lucide-react";
import type { AdminPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

/**
 * Every link declares the permission it needs. The nav then renders only what
 * this account can actually open.
 *
 * This is presentation, not enforcement: each page calls requirePermission()
 * and each SQL function re-checks has_permission(). Hiding a link the user
 * cannot use is a courtesy, not a lock.
 */
const SECTIONS: {
  title: string;
  links: {
    href: string;
    label: string;
    icon: typeof Package;
    permission?: AdminPermission;
  }[];
}[] = [
  {
    title: "Overview",
    // The dashboard is the landing page for anyone with admin access at all.
    links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Catalog",
    links: [
      { href: "/admin/products", label: "Products", icon: Package, permission: "products" },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, permission: "categories" },
      { href: "/admin/brands", label: "Brands", icon: Tag, permission: "products" },
      { href: "/admin/requests", label: "Product requests", icon: PackagePlus, permission: "products" },
      { href: "/admin/stock", label: "Stock", icon: Truck, permission: "stock" },
    ],
  },
  {
    title: "Sales",
    links: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, permission: "orders" },
      { href: "/admin/payments", label: "Payments", icon: CreditCard, permission: "payments" },
      { href: "/admin/customers", label: "Customers", icon: Users, permission: "customers" },
    ],
  },
  {
    title: "Marketing",
    links: [
      { href: "/admin/coupons", label: "Coupons", icon: Ticket, permission: "coupons" },
      { href: "/admin/promotions", label: "Promotions", icon: Layers, permission: "coupons" },
      { href: "/admin/banners", label: "Banners", icon: ImageIcon, permission: "banners" },
      { href: "/admin/reviews", label: "Reviews", icon: Star, permission: "reviews" },
    ],
  },
  {
    title: "Insight",
    links: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, permission: "reports" },
      { href: "/admin/credit", label: "Credit accounts", icon: CreditCard, permission: "settings" },
      { href: "/admin/staff", label: "Staff", icon: ShieldCheck, permission: "staff" },
      { href: "/admin/design", label: "Design", icon: Palette, permission: "settings" },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings" },
    ],
  },
];

export function AdminNav({
  permissions,
  storeName,
  pendingPayments = 0,
  newRequests = 0,
}: {
  permissions: AdminPermission[];
  storeName: string;
  /** Manual transfers awaiting a decision — worth a badge, it blocks dispatch. */
  pendingPayments?: number;
  /** Product requests nobody has looked at yet. */
  newRequests?: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const allowed = (p?: AdminPermission) => !p || permissions.includes(p);

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-line px-4">
        <span className="text-lg font-bold tracking-tight text-ink">{storeName}</span>
        <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
          Admin
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {SECTIONS.map((section) => {
          const links = section.links.filter((l) => allowed(l.permission));
          if (links.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {section.title}
              </p>
              {links.map((l) => {
                const active =
                  l.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(l.href);
                const badge =
                  l.href === "/admin/payments"
                    ? pendingPayments
                    : l.href === "/admin/requests"
                      ? newRequests
                      : 0;

                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-brand-50 font-medium text-brand-700"
                        : "text-ink-soft hover:bg-surface-sunken",
                    )}
                  >
                    <l.icon size={16} />
                    {l.label}
                    {badge > 0 ? (
                      <span className="ml-auto rounded-full bg-warning px-1.5 text-[10px] font-bold tabular text-white">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface lg:hidden"
        aria-label="Open admin menu"
      >
        <Menu size={18} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface shadow-pop">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-lg hover:bg-surface-sunken"
              aria-label="Close menu"
            >
              <X size={17} />
            </button>
            {nav}
          </div>
        </div>
      ) : null}

      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-0 h-dvh">{nav}</div>
      </aside>
    </>
  );
}
