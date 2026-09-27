"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Search, X, Check, Loader2 } from "lucide-react";
import { searchPromotionProducts, type PromotionProduct } from "@/lib/actions/admin";
import { formatTaka } from "@/lib/utils/money";

/**
 * Find products by name or SKU, for the Promotions forms.
 *
 * Searches the server as you type (the whole catalogue, not a preloaded
 * slice), and posts the choice as hidden inputs named `name` — one for a
 * single pick, one per product for a multi pick — so the existing server
 * actions read exactly what they read before.
 *
 * Enter picks the highlighted result instead of submitting the form around it.
 */
export function ProductSearchPicker({
  name,
  multiple = false,
  value,
  onChange,
  placeholder = "Search products by name or SKU…",
}: {
  name: string;
  multiple?: boolean;
  /** Chosen products, owned by the parent so it can clear them after a save. */
  value: PromotionProduct[];
  onChange: (next: PromotionProduct[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  // Results remember the query they answer, so a list left over from "anker"
  // is never acted on while "anker 20000" is still being fetched.
  const [results, setResults] = useState<{ q: string; items: PromotionProduct[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState(false);
  const [searching, startSearch] = useTransition();
  const latest = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const chosenIds = new Set(value.map((p) => p.id));

  // Debounced search. Only the newest request may set results, so a slow
  // reply for "an" cannot overwrite the reply for "anker".
  useEffect(() => {
    if (!open) return;
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      startSearch(async () => {
        try {
          const found = await searchPromotionProducts(query);
          if (ticket !== latest.current) return;
          setResults({ q: query, items: found });
          setActive(0);
          setError(false);
        } catch {
          if (ticket === latest.current) setError(true);
        }
      });
    }, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, open]);

  // Close when a click lands outside the picker (focus leaving is handled by
  // onBlur on the container below).
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const choose = (p: PromotionProduct) => {
    if (multiple) {
      onChange(chosenIds.has(p.id) ? value.filter((v) => v.id !== p.id) : [...value, p]);
      // Stay open so several products can be added in a row.
    } else {
      onChange([p]);
      setOpen(false);
      setQuery("");
      // The search box is about to unmount; put focus on the chosen chip's
      // button rather than letting it fall to <body>.
      requestAnimationFrame(() => boxRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    }
  };

  const showSearch = multiple || value.length === 0;
  const fresh = results !== null && results.q === query;
  // Older results stay visible (dimmed) while the new ones load, so the list
  // does not flicker on every keystroke — but Enter only acts on fresh ones.
  const list = results?.items ?? [];
  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div
      ref={boxRef}
      className="relative"
      onBlur={(e) => {
        // Tabbing out must close the list, or it stays open over the fields
        // below while the user types into them.
        if (!boxRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {value.map((p) => (
        <input key={p.id} type="hidden" name={name} value={p.id} />
      ))}

      {value.length > 0 ? (
        <ul className={`flex flex-wrap gap-1.5 ${showSearch ? "mb-2" : ""}`}>
          {value.map((p) => (
            <li
              key={p.id}
              className="flex max-w-full items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 py-1 pl-2 pr-1 text-sm text-ink"
            >
              <span className="min-w-0 truncate font-medium">{p.name}</span>
              <span className="shrink-0 text-xs tabular text-ink-muted">
                {formatTaka(p.price_paisa)}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v.id !== p.id))}
                className="shrink-0 rounded p-0.5 text-ink-muted hover:bg-surface hover:text-danger"
                aria-label={multiple ? `Remove ${p.name}` : `Change product (${p.name})`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {showSearch ? (
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            // text, not search: a search box's own Escape clears the text and
            // fires a change, which reopened the list it was meant to close.
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && list[active] ? optionId(active) : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((i) => Math.min(i + 1, Math.max(list.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                // Never submit the promotion form from the search box — and
                // only pick from results that answer what is typed now.
                e.preventDefault();
                if (open && fresh && list[active]) choose(list[active]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-9 text-sm focus:border-brand-600 focus:outline-none"
          />
          {searching ? (
            <Loader2
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-faint"
            />
          ) : null}
        </div>
      ) : null}

      {showSearch && open ? (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable={multiple || undefined}
          className="absolute inset-x-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lift"
        >
          {error ? (
            <li className="px-3 py-2 text-sm text-danger">
              Could not search. Check the connection and try again.
            </li>
          ) : results === null || (!fresh && list.length === 0) ? (
            <li className="px-3 py-2 text-sm text-ink-muted">Searching…</li>
          ) : list.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted">
              No product matches “{query.trim()}”.
            </li>
          ) : (
            list.map((p, i) => {
              const picked = chosenIds.has(p.id);
              return (
                <li
                  key={p.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={picked}
                  onMouseEnter={() => setActive(i)}
                  // mousedown, not click: keeps focus in the search box.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(p);
                  }}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${
                    i === active ? "bg-surface-sunken" : ""
                  } ${fresh ? "" : "opacity-50"}`}
                >
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken">
                    {p.thumbnail_url ? (
                      <Image src={p.thumbnail_url} alt="" fill sizes="32px" className="object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink">{p.name}</span>
                    <span className="block text-[11px] tabular text-ink-faint">{p.sku}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular text-ink-muted">
                    {formatTaka(p.price_paisa)}
                  </span>
                  {multiple ? (
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                        picked ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong"
                      }`}
                    >
                      {picked ? <Check size={13} /> : null}
                    </span>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
