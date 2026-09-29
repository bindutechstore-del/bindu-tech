"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  LogIn,
  UserPlus,
  Package,
  Heart,
  MapPin,
  ShoppingBag,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";

/**
 * Account menu in the header.
 *
 * Signed out it offers the three things a visitor actually wants from this
 * icon — sign in, register, or check where an order is. Order tracking is
 * deliberately here too: most people chasing a parcel never made an account,
 * and hiding tracking behind a login is how you generate support calls.
 */
export function AccountMenu({ name, isStaff = false }: { name: string | null; isStaff?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on navigation — the menu outlives the click that triggered it
  // otherwise, and reopens over the new page.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signedOut = [
    { href: "/sign-in", label: "Sign In", icon: LogIn },
    { href: "/sign-up", label: "Register", icon: UserPlus },
    { href: "/track", label: "Track Order", icon: Package },
  ];

  const signedIn = [
    { href: "/account", label: "My account", icon: User },
    { href: "/account/orders", label: "My orders", icon: ShoppingBag },
    { href: "/account/wishlist", label: "Wishlist", icon: Heart },
    { href: "/account/addresses", label: "Addresses", icon: MapPin },
    { href: "/track", label: "Track Order", icon: Package },
    // Staff only: the way into the back office from any screen size.
    ...(isStaff ? [{ href: "/admin", label: "Admin panel", icon: ShieldCheck }] : []),
  ];

  const items = name ? signedIn : signedOut;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-ink-soft hover:bg-surface-sunken"
      >
        <User size={19} />
        <span className="hidden max-w-24 truncate text-sm font-medium lg:inline">
          {name ?? "Account"}
        </span>
        <ChevronDown
          size={14}
          className={`hidden transition-transform lg:block ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-pop"
        >
          {name ? (
            <div className="border-b border-line px-3 pb-2 pt-1">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              <p className="text-xs text-ink-faint">Signed in</p>
            </div>
          ) : null}

          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink-soft hover:bg-surface-sunken hover:text-ink"
            >
              <Icon size={16} className="shrink-0 text-ink-faint" />
              {label}
            </Link>
          ))}

          {name ? (
            <form action={signOut} className="border-t border-line pt-1">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-danger hover:bg-danger-soft"
              >
                <LogOut size={16} className="shrink-0" />
                Sign out
              </button>
            </form>
          ) : (
            <p className="border-t border-line px-3 pb-1 pt-2 text-xs leading-5 text-ink-faint">
              Register to save addresses and reorder in one tap.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
