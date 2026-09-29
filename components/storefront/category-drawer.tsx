"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Tag,
  Flame,
  ChevronRight,
  ChevronDown,
  Users,
  Truck,
  Handshake,
  LayoutGrid,
  Home,
  Info,
  Mail,
  LogIn,
  UserPlus,
  User,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/types/database";
import { OPEN_BROWSE_EVENT } from "./mobile-tab-bar";

type NavItem = { href: string; label: string; icon: LucideIcon };

/** The short list, matching the client's design — not a sitemap. */
const NAVIGATION: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/track", label: "Track Order", icon: Truck },
];

/** Shown under the ACCOUNT heading when nobody is signed in. */
const SIGNED_OUT: NavItem[] = [
  { href: "/sign-in", label: "Sign In", icon: LogIn },
  { href: "/sign-up", label: "Register", icon: UserPlus },
];

/** ...and when somebody is. */
const SIGNED_IN: NavItem[] = [
  { href: "/account", label: "My Account", icon: User },
  { href: "/account/orders", label: "My Orders", icon: ShoppingBag },
];

const PARTNER_LINKS: {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  { href: "/group-buy", label: "Group Buy", icon: Users, tone: "bg-brand-600" },
  { href: "/dropship", label: "Dropship", icon: Truck, tone: "bg-ink" },
  {
    href: "/be-partner",
    label: "Be Partner",
    icon: Handshake,
    tone: "bg-brand-700",
  },
];

/**
 * Browse drawer: categories on one tab, everything else on the other.
 *
 * Opens from the hamburger on mobile and from the "Categories" button in the
 * desktop nav bar, so there is one list to maintain rather than a mobile menu
 * and a separate desktop mega-menu that drift apart.
 */
export function CategoryDrawer({
  categories,
  signedIn = false,
  userName = null,
  avatarUrl = null,
  variant = "icon",
}: {
  categories: Category[];
  /** Swaps the ACCOUNT section between Sign In/Register and account links. */
  signedIn?: boolean;
  /** First name for the greeting card at the top. */
  userName?: string | null;
  /** The customer's own picture, uploaded on their account page. */
  avatarUrl?: string | null;
  /**
   * "icon" is the mobile hamburger, "bar" the desktop Categories button.
   * The header renders both; only one is visible at a breakpoint, so the two
   * instances can never be open at the same time.
   */
  variant?: "icon" | "bar";
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"categories" | "navigation">("categories");
  /** The main category whose sub-categories are showing, if any. */
  const [expanded, setExpanded] = useState<string | null>(null);

  // Main categories, and each one's sub-categories (already in position order).
  const mains = categories.filter((c) => !c.parent_id);
  const subsOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // The phone navbar's Menu button opens this same drawer.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_BROWSE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_BROWSE_EVENT, onOpen);
  }, []);

  // A drawer that survives navigation covers the page the visitor just asked for.
  useEffect(() => setOpen(false), [pathname]);

  // Lock the page behind the drawer, and restore on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  const drawer = (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-ink/45"
        onClick={close}
        aria-label="Close menu"
        tabIndex={-1}
      />

      <nav
        className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-surface shadow-pop"
        aria-label="Browse"
      >
        {/* Greeting card: the customer's picture and name, or an invitation
            to sign in — the first thing in the menu, as on the client's
            reference. */}
        <div className="flex shrink-0 items-center gap-2 p-3">
          <Link
            href={signedIn ? "/account" : "/sign-in"}
            onClick={close}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-brand-600 px-3 py-2.5 text-white hover:bg-brand-700"
          >
            <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/90 text-brand-600">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill sizes="44px" className="object-cover" />
              ) : signedIn && userName ? (
                <span className="text-lg font-bold">{userName.slice(0, 1).toUpperCase()}</span>
              ) : (
                <User size={22} />
              )}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-base font-semibold">
                {signedIn ? `Hello, ${userName || "there"}!` : "Hello there!"}
              </span>
              <span className="block text-sm text-white/85">
                {signedIn ? "My account" : "Sign in"}
              </span>
            </span>
          </Link>
          <button
            onClick={close}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-sunken"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Two tabs rather than one long scroll — the category list alone is
            long enough that policy links below it were never reached. */}
        <div
          role="tablist"
          aria-label="Browse sections"
          className="grid shrink-0 grid-cols-2 border-b border-line"
        >
          {(["categories", "navigation"] as const).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`relative py-3 text-sm font-semibold capitalize transition-colors ${
                tab === key
                  ? "text-brand-700"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {key}
              {tab === key ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-600" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {tab === "categories" ? (
            <ul className="p-2">
              <li>
                <Link
                  href="/products"
                  onClick={close}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken"
                >
                  <LayoutGrid size={17} className="shrink-0 text-ink-faint" />
                  <span className="flex-1">All products</span>
                  <ChevronRight size={15} className="shrink-0 text-ink-faint" />
                </Link>
              </li>

              {mains.map((c) => {
                const subs = subsOf(c.id);

                // No sub-categories: a plain link, as before.
                if (subs.length === 0) {
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/products?category=${c.slug}`}
                        onClick={close}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft hover:bg-surface-sunken hover:text-ink"
                      >
                        <Tag size={17} className="shrink-0 text-ink-faint" />
                        <span className="flex-1 truncate">{c.name}</span>
                        <ChevronRight size={15} className="shrink-0 text-ink-faint" />
                      </Link>
                    </li>
                  );
                }

                // With sub-categories: the row opens them in place.
                const isOpen = expanded === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                      aria-expanded={isOpen}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-surface-sunken ${
                        isOpen ? "font-medium text-ink" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      <Tag size={17} className="shrink-0 text-ink-faint" />
                      <span className="flex-1 truncate">{c.name}</span>
                      <ChevronDown
                        size={15}
                        className={`shrink-0 text-ink-faint transition-transform ${isOpen ? "" : "-rotate-90"}`}
                      />
                    </button>
                    {isOpen ? (
                      <ul className="mb-1 ml-5 border-l border-line pl-3">
                        <li>
                          <Link
                            href={`/products?category=${c.slug}`}
                            onClick={close}
                            className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-surface-sunken"
                          >
                            All {c.name}
                          </Link>
                        </li>
                        {subs.map((s) => (
                          <li key={s.id}>
                            <Link
                              href={`/products?category=${s.slug}`}
                              onClick={close}
                              className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-surface-sunken hover:text-ink"
                            >
                              {s.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}

              {/* Discounted stock, called out in red because it is the row
                  people open this drawer looking for. */}
              <li className="mt-1 border-t border-line pt-1">
                <Link
                  href="/products?on_sale=1"
                  onClick={close}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-danger hover:bg-danger-soft"
                >
                  <Flame size={17} className="shrink-0" />
                  <span className="flex-1">Sale</span>
                  <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Hot
                  </span>
                </Link>
              </li>
            </ul>
          ) : (
            <div className="p-2">
              <ul>
                {NAVIGATION.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] text-ink hover:bg-surface-sunken"
                    >
                      <Icon size={19} className="shrink-0 text-ink-muted" />
                      <span className="flex-1">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mt-2 border-t border-line px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Account
              </p>

              <ul>
                {(signedIn ? SIGNED_IN : SIGNED_OUT).map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] text-ink hover:bg-surface-sunken"
                    >
                      <Icon size={19} className="shrink-0 text-ink-muted" />
                      <span className="flex-1">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Pinned to the bottom of the drawer, full width and stacked, so the
            three partner routes read as calls to action rather than as three
            more list items competing with the nav above. */}
        <div className="shrink-0 space-y-1.5 border-t border-line bg-surface-sunken/60 p-3">
          {PARTNER_LINKS.map(({ href, label, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${tone}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex size-10 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-sunken md:hidden"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu size={20} />
        </button>
      ) : (
        /* The desktop trigger sits in the category bar, where a shopper looks
           for "all categories" on every other BD storefront. */
        <button
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          aria-label="Open categories"
          aria-expanded={open}
        >
          <Menu size={16} />
          Categories
        </button>
      )}

      {/*
        Portalled to <body> on purpose. The header sets `backdrop-blur`, and a
        `backdrop-filter` makes an element a containing block for
        position:fixed descendants — so a drawer rendered inside the header
        would size itself to the header (~135px tall) instead of the viewport.
      */}
      {mounted && open ? createPortal(drawer, document.body) : null}
    </>
  );
}
