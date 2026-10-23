"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A sideways-scrolling row that moves on by itself, one tile at a time, and
 * loops back to the start at the end — the homepage "Shop by category" row.
 *
 * It is still an ordinary scrollable row (the tiles are not duplicated, so
 * nothing is read or indexed twice) and it gets out of the way: it stops while
 * the shopper touches, swipes, hovers or tabs into it, picks up again a few
 * seconds after they let go, idles while off screen or in a background tab,
 * and never moves at all for anyone who asked their device to reduce motion.
 */
export function AutoScrollRail({
  children,
  className,
  intervalMs = 2500,
}: {
  children: ReactNode;
  className?: string;
  intervalMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let hovered = false;
    let touchedAt = 0;
    let visible = true;
    const RESUME_AFTER = 4000;

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);

    const tick = () => {
      if (hovered || !visible || document.hidden) return;
      if (Date.now() - touchedAt < RESUME_AFTER) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4) return; // everything already fits
      if (el.scrollLeft >= max - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const first = el.firstElementChild as HTMLElement | null;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth / 2;
      el.scrollBy({ left: step, behavior: "smooth" });
    };
    const timer = window.setInterval(tick, intervalMs);

    const touched = () => {
      touchedAt = Date.now();
    };
    const enter = () => {
      hovered = true;
    };
    const leave = () => {
      hovered = false;
      touchedAt = Date.now();
    };
    const opts = { passive: true } as const;
    for (const ev of ["pointerdown", "touchstart", "wheel", "keydown", "focusin"] as const) {
      el.addEventListener(ev, touched, opts);
    }
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);

    return () => {
      window.clearInterval(timer);
      io.disconnect();
      for (const ev of ["pointerdown", "touchstart", "wheel", "keydown", "focusin"] as const) {
        el.removeEventListener(ev, touched);
      }
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, [intervalMs]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
