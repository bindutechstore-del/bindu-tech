"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, Search, User } from "lucide-react";

/** Events the header's menu drawer and search box listen for. */
export const OPEN_BROWSE_EVENT = "browse:open";
export const FOCUS_SEARCH_EVENT = "search:focus";

/**
 * The phone navbar: Home, Menu, Cart, Search, Account — pinned to the bottom
 * of the screen, where a thumb already is. Phones only; from tablet width up
 * the header does this job.
 *
 * Menu and Search do not duplicate anything: they open the same menu drawer
 * and focus the same search box the header has, by event, so there is still
 * one of each to maintain.
 */
export function MobileTabBar({ cartCount }: { cartCount: number }) {
  const pathname = usePathname();

  const item =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium uppercase tracking-wide";
  const on = (active: boolean) => (active ? "text-white" : "text-white/75 hover:text-white");

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-700 bg-brand-600 pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <div className="flex">
        <Link href="/" className={`${item} ${on(pathname === "/")}`}>
          <Home size={21} strokeWidth={pathname === "/" ? 2.4 : 1.8} />
          Home
        </Link>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_BROWSE_EVENT))}
          className={`${item} ${on(false)}`}
        >
          <LayoutGrid size={21} strokeWidth={1.8} />
          Menu
        </button>

        <Link
          href="/cart"
          className={`${item} ${on(pathname === "/cart")}`}
        >
          {/* Named by what it shows ("Cart", or "3 Cart"): an aria-label that
              differs from the visible text confuses voice control. An empty
              cart shows no badge at all. */}
          <span className="relative">
            <ShoppingBag size={21} strokeWidth={pathname === "/cart" ? 2.4 : 1.8} aria-hidden />
            {cartCount > 0 ? (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-white tabular">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </span>
          Cart
        </Link>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT))}
          className={`${item} ${on(false)}`}
        >
          <Search size={21} strokeWidth={1.8} />
          Search
        </button>

        <Link
          href="/account"
          className={`${item} ${on(pathname.startsWith("/account"))}`}
        >
          <User size={21} strokeWidth={pathname.startsWith("/account") ? 2.4 : 1.8} />
          Account
        </Link>
      </div>
    </nav>
  );
}
