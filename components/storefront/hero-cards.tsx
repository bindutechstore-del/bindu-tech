import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroRail } from "./hero-rail";
import type { Banner } from "@/types/database";

/**
 * The hero: a row of tall campaign cards the shopper scrolls by hand.
 *
 * The card is a fixed 9:16 portrait at every breakpoint — that ratio is the
 * whole look, so it does not change between phone and desktop. Only how many
 * fit on screen changes: exactly two on a phone, four or five on a monitor.
 *
 * On a phone the two cards fill the row exactly, with no sliver of a third.
 * From `sm:` up the widths go back to leaving the next card partly visible,
 * which is the affordance that tells a mouse user the row scrolls at all.
 *
 * Content comes from `banners` — artwork, Bangla headline, caption, link and
 * accent colour are all editable at /admin/banners with no deploy. Two cards is
 * the practical minimum for the layout to read as a set; the seed ships seven.
 */
export function HeroCards({
  banners,
  heading,
}: {
  banners: Banner[];
  heading: string;
}) {
  if (banners.length === 0) return null;

  return (
    <section className="bg-surface-sunken py-2 sm:py-3" aria-label="Featured collections">
      {/*
        The cards deliberately carry no visible page heading, so the document
        still needs one for search engines and screen readers.
      */}
      <h1 className="sr-only">{heading}</h1>

      <div className="mx-auto max-w-7xl">
        {/*
          scroll-pl matches the horizontal padding. Without it `scroll-snap-align:
          start` snaps to the scroll-port edge and ignores the padding, which
          drags the first card flush against the screen edge on load.
        */}
        <HeroRail>
          {banners.map((b, i) => (
            <li
              key={b.id}
              // Phone: exactly two cards, nothing of a third.
              //
              // A flex-basis percentage resolves against the container's
              // CONTENT box, so subtracting the one 0.5rem gap between the
              // pair and halving it lands the second card's right edge exactly
              // on the content edge. That alone still leaks a sliver, because
              // the rail's own px-2 padding is *inside* the scrollport and the
              // third card starts one gap later — visible unless the gap is at
              // least as wide as that padding. gap-2 matching px-2 is what
              // pushes the third card to precisely the scrollport edge.
              //
              // From sm: up the widths go back to showing a sliver of the next
              // card, which is the only cue that the row scrolls.
              //
              // `snap-always` (scroll-snap-stop: always) covers wheel and
              // keyboard scrolling. It is NOT what bounds a touch swipe to one
              // card — real flings sailed straight past it; HeroRail does that.
              className="
                flex-none snap-always
                basis-[calc((100%-0.5rem)/2)]
                sm:basis-[38%] md:basis-[31%]
                lg:basis-[23.5%] xl:basis-[19.5%]
              "
            >
              {/* Two cards fill a phone screen; preloading a third only
                  slowed the two the visitor actually sees. */}
              <CampaignCard banner={b} priority={i < 2} eager={i < 5} />
            </li>
          ))}
        </HeroRail>
      </div>
    </section>
  );
}

function CampaignCard({
  banner: b,
  priority = false,
  eager = false,
}: {
  banner: Banner;
  priority?: boolean;
  /** On screen at first paint on a wide screen (up to five cards): never lazy. */
  eager?: boolean;
}) {
  const accent = b.accent_hex ?? "#016952";

  return (
    <Link
      href={b.cta_href ?? "/products"}
      className="
        group relative block aspect-[9/16] w-full overflow-hidden rounded-xl
        bg-ink ring-1 ring-ink/5 transition-shadow duration-300
        hover:shadow-pop focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-brand-600 focus-visible:ring-offset-2
      "
    >
      {b.image_url ? (
        <Image
          src={b.image_url}
          alt=""
          fill
          sizes="(min-width: 1280px) 250px, (min-width: 1024px) 300px, (min-width: 768px) 31vw, (min-width: 640px) 38vw, 50vw"
          // Next 16's `priority` only adds a preload, which Chrome still
          // fetches at Low priority behind the scripts. High fetch priority is
          // what gets the first cards (the LCP image) on screen early.
          loading={priority || eager ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
        />
      ) : null}

      {/*
        Shading kept to what the text needs, so the artwork shows at its own
        brightness — the shop's banners carry their own Bangla headlines, and
        the old full-card tint and two heavy scrims made them look dim:
          1. a TOP scrim only when a headline is laid over the picture;
          2. a short bottom scrim under the caption block.
      */}
      {b.eyebrow ? (
        <div className="absolute inset-x-0 top-0 h-[34%] bg-gradient-to-b from-black/55 via-black/15 to-transparent" />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
      {/* The banner's accent colour (admin → Banners), as a strip along the bottom edge. */}
      <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: accent }} />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />

      {/* Bangla headline, burned over the artwork like the print campaigns. */}
      {b.eyebrow ? (
        <p
          className="
            absolute inset-x-0 top-[11%] px-3 text-center font-bold
            leading-[1.35] text-white
            drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]
            text-[15px] sm:text-lg lg:text-xl
          "
        >
          {b.eyebrow}
        </p>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
        <h2 className="text-base font-bold leading-tight tracking-tight text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] sm:text-lg lg:text-xl">
          {b.title}
        </h2>

        {b.subtitle ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] sm:text-xs lg:text-[13px]">
            {b.subtitle}
          </p>
        ) : null}

        <span className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white sm:text-[13px]">
          {b.cta_label ?? "Browse"}
          <ArrowRight
            size={14}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}
