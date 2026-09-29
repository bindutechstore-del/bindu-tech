"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search, Loader2 } from "lucide-react";
import { FOCUS_SEARCH_EVENT } from "./mobile-tab-bar";

/**
 * Header search. Submits to /products?q=… rather than querying as you type —
 * a suggestion request per keystroke is the fastest way to exhaust the free
 * tier's connection pool.
 *
 * Wrapped in startTransition so the UI stays responsive while the server
 * queries the database.
 */
export function SearchBox() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    startTransition(() => {
      router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
    });
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full">
      {isPending ? (
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
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search phones, laptops, audio…"
        aria-label="Search products"
        className="h-10 w-full rounded-lg border border-line-strong bg-surface-sunken pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-600 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600/15"
      />
    </form>
  );
}
