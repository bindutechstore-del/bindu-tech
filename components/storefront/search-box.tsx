"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { FOCUS_SEARCH_EVENT } from "./mobile-tab-bar";
import { suggestProducts } from "@/lib/actions/search";
import type { SearchSuggestion } from "@/lib/queries/catalog";
import { formatTaka } from "@/lib/utils/money";

/** Wait this long after the last keystroke before asking the server. */
const DEBOUNCE_MS = 180;

/**
 * Header search with live results.
 *
 * From the first letter typed, matching products drop down under the box
 * (names first, then the full-text index), so a shopper can tap straight to
 * one. Enter, or "See all results", still goes to /products?q=… for the full
 * filterable list.
 *
 * Keystrokes are debounced and a slower, older answer never replaces a newer
 * one, so fast typing costs a handful of small queries, not one per key.
 */
export function SearchBox() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const listId = useId();

  // The phone navbar's Search button. Two of these boxes exist (header and
  // mobile row); only the one actually on screen takes focus.
  useEffect(() => {
    const onFocus = () => {
      const input = inputRef.current;
      if (!input || input.offsetParent === null) return;
      input.focus();
      input.select();
    };
    window.addEventListener(FOCUS_SEARCH_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, onFocus);
  }, []);

  // Live results, debounced; only the newest request may write.
  useEffect(() => {
    const q = value.trim();
    if (!q) {
      seq.current++;
      setResults([]);
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const rows = await suggestProducts(q);
        if (seq.current === mine) {
          setResults(rows);
          setActive(-1);
        }
      } catch {
        if (seq.current === mine) setResults([]);
      } finally {
        if (seq.current === mine) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  const go = (href: string) => {
    setOpen(false);
    inputRef.current?.blur();
    startTransition(() => router.push(href));
  };

  const searchAll = () => {
    const q = value.trim();
    go(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (open && active >= 0 && results[active]) go(`/products/${results[active].slug}`);
    else searchAll();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % (results.length + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length : i - 1));
    }
  }

  const q = value.trim();
  const showPanel = open && q.length > 0;

  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full">
      {isPending || (loading && showPanel) ? (
        <Loader2
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-brand-600"
          aria-hidden
        />
      ) : (
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
      )}
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Closing on blur waits a beat so a tap on a result still lands.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Search phones, laptops, audio…"
        aria-label="Search products"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-line-strong bg-surface-sunken pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-600 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600/15"
      />

      {showPanel ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <ul id={listId} role="listbox" aria-label="Matching products" className="max-h-[60vh] overflow-y-auto py-1">
            {results.map((r, i) => (
              <li
                key={r.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={active === i}
                // mousedown, not click: fires before the input's blur closes the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(`/products/${r.slug}`);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${active === i ? "bg-brand-50" : ""}`}
              >
                <span className="relative size-10 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken">
                  {r.thumbnail_url ? (
                    <Image src={r.thumbnail_url} alt="" fill sizes="40px" className="object-contain" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="clamp-2 block text-sm leading-5 text-ink">{r.name}</span>
                  <span className="block text-xs tabular">
                    <span className="font-semibold text-ink">{formatTaka(r.price_paisa)}</span>
                    {r.compare_at_paisa && r.compare_at_paisa > r.price_paisa ? (
                      <span className="ml-1.5 text-ink-faint line-through">{formatTaka(r.compare_at_paisa)}</span>
                    ) : null}
                    {r.stock <= 0 ? <span className="ml-1.5 text-danger">Out of stock</span> : null}
                  </span>
                </span>
              </li>
            ))}
            {!loading && results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-ink-muted">No product names match “{q}” yet.</li>
            ) : null}
            <li
              id={`${listId}-${results.length}`}
              role="option"
              aria-selected={active === results.length}
              onMouseDown={(e) => {
                e.preventDefault();
                searchAll();
              }}
              onMouseEnter={() => setActive(results.length)}
              className={`flex cursor-pointer items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-sm font-medium text-brand-700 ${
                active === results.length ? "bg-brand-50" : ""
              }`}
            >
              See all results for “{q}”
              <ArrowRight size={15} />
            </li>
          </ul>
        </div>
      ) : null}
    </form>
  );
}
