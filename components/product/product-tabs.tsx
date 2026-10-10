"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface ProductTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Description / Specifications / Reviews, as tabs.
 *
 * Every panel is rendered into the HTML and only hidden, never left out, so
 * search engines still read the specification table and the reviews. A link
 * to #reviews (or any tab id) opens that tab.
 */
export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  if (tabs.length === 0) return null;

  // Arrow keys move between tabs, as screen-reader users expect of a tablist.
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (i === last ? 0 : i + 1)
      : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(tabs[next].id);
    buttons.current[next]?.focus();
  };

  return (
    <section className="mt-12">
      <div
        role="tablist"
        aria-label="Product information"
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map((t, i) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={t.id}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                on
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={t.id}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          className="pt-6"
        >
          {t.content}
        </div>
      ))}
    </section>
  );
}
