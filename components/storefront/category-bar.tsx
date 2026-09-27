"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutGrid } from "lucide-react";

/**
 * The desktop category bar.
 *
 * It used to be every category in one horizontally scrolling strip — 37 of
 * them — so reaching one meant scrolling a thin bar, Windows drew a scrollbar
 * (and up/down arrows) under it, and "Track" sat at the far end of the
 * scroll. Now:
 *
 * - "Categories" opens a panel with EVERY category laid out in a grid, so
 *   anything is one click away without scrolling.
 * - The bar shows only the categories that fit on one line, whole — the rest
 *   wrap onto a hidden second line instead of being cut in half — and a
 *   "More" button appears whenever some are hidden.
 * - Track (and Admin for staff) are pinned on the right, outside the list.
 *
 * The links and the panel's contents are rendered on the server and passed
 * in; this component only owns opening, closing and the overflow check.
 */
export function CategoryBar({
  children,
  panel,
  trailing,
}: {
  /** The inline links. Each should be h-8 so one row fills the list. */
  children: React.ReactNode;
  /** The full category grid shown when the bar is opened. */
  panel: React.ReactNode;
  /** Pinned on the right (Track, Admin). */
  trailing?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  // Which links wrapped onto the hidden second line? They are taken out of
  // the tab order too, so a keyboard user never lands on something invisible.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const check = () => {
      let hidden = 0;
      for (const link of Array.from(list.children) as HTMLElement[]) {
        const off = link.offsetTop >= list.clientHeight;
        if (off) hidden += 1;
        link.toggleAttribute("inert", off);
      }
      setHiddenCount(hidden);
    };
    check();
    // Re-check when the bar resizes (window width) AND when any link does:
    // the web font arriving after this first check changes text widths —
    // and so what fits — without changing the bar's own size.
    const ro = new ResizeObserver(check);
    ro.observe(list);
    for (const link of Array.from(list.children)) ro.observe(link);
    let alive = true;
    document.fonts?.ready.then(() => alive && check());
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, []);

  // A menu left open after navigating covers the page just asked for. (A
  // click on a link inside the panel also closes it — see onClick below —
  // which covers /products?category=a → ?category=b, where the path is the
  // same. useSearchParams is avoided on purpose: in the shared header it
  // would push every statically built page into client-side rendering.)
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <nav
      ref={navRef}
      aria-label="Shop by category"
      className="relative hidden border-t border-line md:block"
    >
      <div className="mx-auto flex h-11 max-w-7xl items-center gap-2 px-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <LayoutGrid size={15} />
          Categories
          <ChevronDown
            size={14}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* One row tall; links that do not fit wrap below and are clipped
            whole, never cut in half, and there is no scrollbar. */}
        <div
          ref={listRef}
          className="flex h-8 min-w-0 flex-1 flex-wrap items-center gap-x-0.5 overflow-hidden"
        >
          {children}
        </div>

        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-controls={panelId}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            More
            <span className="rounded-full bg-brand-50 px-1.5 text-[11px] font-semibold tabular text-brand-700">
              +{hiddenCount}
            </span>
          </button>
        ) : null}

        {trailing ? <div className="flex shrink-0 items-center gap-1">{trailing}</div> : null}
      </div>

      {open ? (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full z-50 border-y border-line bg-surface shadow-pop"
          // Choosing anything in the panel closes it, including a category
          // whose URL differs only in the query string.
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <div className="mx-auto max-h-[70vh] max-w-7xl overflow-y-auto px-4 py-5">{panel}</div>
        </div>
      ) : null}
    </nav>
  );
}
