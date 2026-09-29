"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/types/database";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Hero carousel driven entirely by the `banners` table (placement='hero').
 * An admin adds a slide; no code change. `accent_hex` tints the gradient so
 * each slide can carry its own colour without a class-name lookup table.
 */
export function Hero({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;
  const active = banners[index]!;
  const accent = active.accent_hex ?? "#016952";

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured offers"
    >
      <div className="relative h-[420px] w-full sm:h-[460px] lg:h-[520px]">
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={i !== index}
          >
            {b.image_url ? (
              <Image
                src={b.image_url}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-ink" />
            )}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(100deg, ${accent}f2 0%, ${accent}cc 38%, ${accent}33 68%, transparent 100%)`,
              }}
            />
          </div>
        ))}

        <div className="relative mx-auto flex h-full max-w-7xl items-center px-4 pb-14">
          <div className="max-w-xl text-white">
            {active.eyebrow ? (
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                {active.eyebrow}
              </span>
            ) : null}
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {active.title}
            </h1>
            {active.subtitle ? (
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/85 sm:text-base">
                {active.subtitle}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {active.cta_href && active.cta_label ? (
                <Button asChild size="lg" className="bg-white text-ink hover:bg-white/90">
                  <Link href={active.cta_href}>{active.cta_label}</Link>
                </Button>
              ) : null}
              {active.secondary_cta_href && active.secondary_cta_label ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                >
                  <Link href={active.secondary_cta_href}>
                    {active.secondary_cta_label}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {count > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-5">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4">
              <div className="pointer-events-auto flex gap-2">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === index}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-7 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75",
                    )}
                  />
                ))}
              </div>

              <div className="pointer-events-auto flex gap-2">
                <button
                  onClick={() => setIndex((i) => (i - 1 + count) % count)}
                  aria-label="Previous slide"
                  className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setIndex((i) => (i + 1) % count)}
                  aria-label="Next slide"
                  className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
